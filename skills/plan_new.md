---
name: AI Features Implementation (5h Sprint)
overview: 'Implement 2 tính năng AI (RAG Q&A + AI Quiz Generation) đúng phạm vi C4 diagram. Scope đã bóp cho 5h: giữ đúng container + BE component đã confirm, defer toàn bộ FE, testing, edge case hardening, và các tính năng nice-to-have.'
todos:
  - id: phase-0-infra
    content: 'Phase 0 (~1h): Schema (Lesson extend + LessonChunk + AiJob + QuizDraft) + env config + BullMQ setup'
    status: pending
  - id: phase-1-ai-adapter
    content: 'Phase 1A (~1h): AI Adapter Module — LlmService + EmbeddingService + PromptTemplateService'
    status: pending
  - id: phase-1-shared
    content: 'Phase 1B (~1h): Shared services — VectorStoreService + ChunkingService'
    status: pending
  - id: phase-2-rag
    content: 'Phase 2 (~1h): RAG trong Lesson Module — IndexingProcessor + askLesson endpoint'
    status: pending
  - id: phase-3-quiz
    content: 'Phase 3 (~1h): Quiz Gen trong Quiz Module — QuizGenProcessor + draft endpoints'
    status: pending
isProject: false
---

# Plan: 2 Feature AI — 5h Sprint (Scope đã bóp)

## Những gì đã DEFER (không làm trong sprint này)

| Hạng mục                                   | Lý do                                                  |
| ------------------------------------------ | ------------------------------------------------------ |
| Frontend (Phase 4 cũ)                      | Không nằm trong BE component, không ảnh hưởng contract |
| Unit test / Integration test đầy đủ        | Smoke test thủ công thay thế                           |
| Edge case hardening (5.5.x)                | Ghi TODO comment trong code, làm sau                   |
| IVFFlat vector index (Step 0.2.1)          | Dev ít data, sequential scan OK                        |
| LRU cache trong EmbeddingService           | Nice-to-have                                           |
| tiktoken pre-flight token estimate         | Thay bằng truncate theo char count                     |
| AbortSignal trong LlmService               | Làm sau                                                |
| YouTube transcript fetch                   | Dùng `lessonDesc` + `textContent` làm context          |
| AiJob cron cleanup                         | Không gấp                                              |
| `/admin/ai/usage` aggregate endpoint       | Đã đánh dấu DEFER trong plan gốc                       |
| Retry phức tạp (honor Retry-After, jitter) | Retry đơn giản 3 lần, delay cố định 1s                 |

---

## Nguyên tắc scope (giữ nguyên từ C4)

**Container diagram cho phép:**

- Backend container — "Business modules + adapters + AI orchestration"
- PostgreSQL + pgvector (separate)
- Redis (BullMQ broker/backend)
- LLM Provider (external, qua OpenRouter)

**BE Component Zoom-In:**

- Adapters layer: thêm **AI** (cùng layer với Blockchain, IPFS)
- Domain layer: mở rộng **Lesson** + **Quiz**, KHÔNG tạo module mới
- Shared layer: thêm **VectorStoreService** + **ChunkingService**

---

## Kiến trúc

```
src/modules/ai/           ← Adapter layer (NEW)
  ai.module.ts
  llm.service.ts
  embedding.service.ts
  prompt-template.service.ts
  ai.error.ts

src/shared/services/      ← Shared layer (EXTEND)
  vector-store.service.ts (NEW)
  chunking.service.ts     (NEW)

src/modules/lesson/       ← Domain layer (EXTEND)
  processors/
    indexing.processor.ts (NEW)
  lesson.service.ts       (EXTEND — thêm askLesson)
  lesson.controller.ts    (EXTEND — thêm POST /lesson/:id/ask)

src/modules/quiz/         ← Domain layer (EXTEND)
  processors/
    quiz-gen.processor.ts (NEW)
  quiz.service.ts         (EXTEND — thêm enqueue + draft endpoints)
  quiz.controller.ts      (EXTEND — thêm generate-ai + drafts endpoints)
```

---

## PHASE 0 — Infrastructure (~1h)

### Step 0.1 — pgvector extension

**File:** `prisma/schema.prisma`

```prisma
datasource db {
  provider   = "postgresql"
  extensions = [pg_trgm(schema: "public"), unaccent(schema: "public"), vector(schema: "public")]
}
```

**Verify:** `npx prisma db push` thành công.

---

### Step 0.2 — Schema

**File:** `prisma/schema.prisma`

**a. Mở rộng `Lesson`:**

```prisma
model Lesson {
  // ... existing fields ...
  lessonDesc         String?  @db.Text
  learningObjectives String[] @default([])
  targetLevel        String?
  keywords           String[] @default([])
  aiSummary          String?  @db.Text
  transcript         String?  @db.Text
  transcriptSource   String?
  transcriptStatus   String?

  chunks     LessonChunk[]
  aiJobs     AiJob[]
  quizDrafts QuizDraft[]
}
```

**b. 3 model mới:**

```prisma
enum AiJobType {
  LESSON_INDEX
  QUIZ_GENERATION
  RAG_ASK
}

enum AiJobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}

enum QuizDraftStatus {
  DRAFT_AI
  PUBLISHED
  REJECTED
}

model LessonChunk {
  id         String   @id @default(cuid())
  lessonId   String
  lesson     Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  chunkIndex Int
  content    String   @db.Text
  embedding  Unsupported("vector(1536)")
  metadata   Json?
  version    Int      @default(1)
  createdAt  DateTime @default(now())

  @@index([lessonId])
}

model AiJob {
  id          String      @id @default(cuid())
  type        AiJobType
  status      AiJobStatus @default(QUEUED)
  lessonId    String
  lesson      Lesson      @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  requestedBy String
  model       String?
  tokenInput  Int?
  tokenOutput Int?
  latencyMs   Int?
  retries     Int         @default(0)
  error       String?     @db.Text
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  quizDrafts  QuizDraft[]

  @@index([lessonId, type])
  @@index([status])
}

model QuizDraft {
  id              String          @id @default(cuid())
  lessonId        String
  lesson          Lesson          @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  aiJobId         String
  aiJob           AiJob           @relation(fields: [aiJobId], references: [id])
  status          QuizDraftStatus @default(DRAFT_AI)
  rawOutput       Json
  validatedOutput Json?
  reviewerId      String?
  reviewNote      String?         @db.Text
  promptVersion   String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([lessonId])
  @@index([status])
}
```

**Verify:** `npx prisma db push && npx prisma generate` thành công.

---

### Step 0.3 — Env config

**File:** `src/shared/config.ts`

```typescript
REDIS_HOST: z.string().default('localhost'),
REDIS_PORT: z.coerce.number().default(6379),

LLM_API_KEY: z.string(),
LLM_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
LLM_HTTP_REFERER: z.string().optional(),
LLM_X_TITLE: z.string().default('Learn Proof'),

LLM_EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
LLM_CHAT_MODEL_CHEAP: z.string().default('openai/gpt-4o-mini'),
LLM_CHAT_MODEL_STRONG: z.string().default('openai/gpt-4o'),

AI_MAX_INPUT_TOKENS: z.coerce.number().default(4000),
AI_CHUNK_SIZE: z.coerce.number().default(500),
AI_CHUNK_OVERLAP: z.coerce.number().default(50),
AI_TOP_K: z.coerce.number().default(5),
```

**Verify:** App boot với `.env` mới, log "Config loaded".

---

### Step 0.4 — BullMQ setup

**File:** `src/modules/lesson/lesson.module.ts`

```typescript
imports: [
  BullModule.forRootAsync({
    useFactory: () => ({
      connection: { host: envConfig.REDIS_HOST, port: envConfig.REDIS_PORT },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }),
  }),
  BullModule.registerQueue({ name: 'lesson-indexing' }),
],
```

**File:** `src/modules/quiz/quiz.module.ts`

```typescript
imports: [
  BullModule.registerQueue({ name: 'quiz-generation' }),
],
```

**Job ID strategy:**

- Indexing: `"index:" + lessonId + ":" + lesson.updatedAt.getTime()`
- Quiz gen: check DRAFT_AI tồn tại trước khi enqueue → 409 nếu đã có

**Verify:** App boot, log `BullMQ connected`.

---

## PHASE 1A — AI Adapter Module (~1h)

### Step 1.1 — AiModule

```
src/modules/ai/
  ai.module.ts
  llm.service.ts
  embedding.service.ts
  prompt-template.service.ts
  ai.error.ts
```

**KHÔNG có:** controller, repo, processor. Pure adapter.

**File:** `src/modules/ai/ai.module.ts`

```typescript
@Module({
  providers: [LlmService, EmbeddingService, PromptTemplateService],
  exports: [LlmService, EmbeddingService, PromptTemplateService],
})
export class AiModule {}
```

Register vào `app.module.ts`.

---

### Step 1.2 — LlmService (simplified)

**Signature:**

```typescript
chatCompletion(params: {
  systemPrompt: string
  userPrompt: string
  model?: 'cheap' | 'strong'
  responseFormat?: 'json'
  maxTokens?: number
}): Promise<{
  content: string
  inputTokens: number
  outputTokens: number
  model: string
  latencyMs: number
}>
```

**Implementation requirements (simplified cho 5h):**

- Axios với `LLM_BASE_URL` (OpenAI-compatible)
- Retry đơn giản: 3 attempts, delay 1s cố định, retry trên 429/5xx/timeout
- KHÔNG retry trên 400/401/403/422
- `response_format: { type: 'json_object' }` khi `responseFormat='json'`
- Strip markdown fences trước khi parse JSON
- Parse `usage.prompt_tokens, usage.completion_tokens`
- Truncate input theo char count nếu quá dài (thay tiktoken)
- Custom errors: `LlmAuthException`, `LlmRateLimitException`, `LlmUnavailableException`, `LlmTimeoutException`, `LlmInvalidJsonException`, `LlmEmptyResponseException`

---

### Step 1.3 — EmbeddingService (simplified)

```typescript
generateEmbedding(text: string): Promise<number[]>
generateEmbeddings(texts: string[]): Promise<number[][]>  // batch max 100/req
```

Không cần LRU cache trong sprint này.

---

### Step 1.4 — PromptTemplateService

```typescript
getTemplate(name: 'rag_answer_v1' | 'quiz_gen_v1'): {
  version: string
  systemPrompt: string
  userTemplate: string
}

render(template: string, vars: Record<string, string>): string
```

Hardcode templates trong code kèm version string.

---

## PHASE 1B — Shared Services (~1h)

### Step 1.5 — VectorStoreService

**File:** `src/shared/services/vector-store.service.ts`

```typescript
upsertChunks(lessonId: string, chunks: {
  chunkIndex: number
  content: string
  embedding: number[]
  metadata?: object
}[]): Promise<void>
// Xóa chunks cũ rồi insert mới (transaction)

searchSimilar(queryEmbedding: number[], options: {
  lessonId: string
  topK?: number
  minScore?: number
}): Promise<{ content: string; score: number; metadata: object }[]>
// Raw SQL: SELECT ... ORDER BY embedding <=> $1 LIMIT $2
```

Dùng `this.prisma.$executeRawUnsafe` / `$queryRawUnsafe` cho pgvector operations.

---

### Step 1.6 — ChunkingService (simplified)

**File:** `src/shared/services/chunking.service.ts`

```typescript
splitText(text: string, options?: {
  chunkSize?: number    // default: AI_CHUNK_SIZE env
  overlap?: number      // default: AI_CHUNK_OVERLAP env
}): string[]
```

Sliding window đơn giản theo word count. Không cần sentence-aware trong sprint này.

**Context assembly** (dùng trong Lesson/Quiz service):

```typescript
// Thứ tự ưu tiên context source:
// 1. lessonDesc (bắt buộc có)
// 2. textContent (nếu lesson TEXT)
// 3. transcript (nếu đã có — KHÔNG fetch YouTube trong sprint này)
buildContext(lesson: Lesson): string {
  const parts = [lesson.lessonDesc]
  if (lesson.textContent) parts.push(lesson.textContent)
  if (lesson.transcript) parts.push(lesson.transcript)
  return parts.filter(Boolean).join('\n\n')
}
```

---

## PHASE 2 — RAG trong Lesson Module (~1h)

### Step 2.1 — IndexingProcessor

**File:** `src/modules/lesson/processors/indexing.processor.ts`

```typescript
@Processor('lesson-indexing')
export class IndexingProcessor {
  @Process()
  async handleIndex(job: Job<{ lessonId: string }>) {
    // 1. Lấy lesson từ DB
    // 2. Build context (lessonDesc + textContent + transcript nếu có)
    // 3. ChunkingService.splitText(context)
    // 4. EmbeddingService.generateEmbeddings(chunks)
    // 5. VectorStoreService.upsertChunks(lessonId, ...)
    // 6. Update lesson.transcriptStatus = 'AVAILABLE' nếu cần
  }
}
```

Enqueue khi lesson được tạo/update (trong `LessonService.create` và `LessonService.update`):

```typescript
await this.lessonIndexingQueue.add({ lessonId }, { jobId: `index:${lessonId}:${lesson.updatedAt.getTime()}` })
```

---

### Step 2.2 — askLesson endpoint

**Controller:** `POST /lesson/:id/ask`

**Service:** `LessonService.askLesson(lessonId, userId, question)`

```typescript
async askLesson(lessonId: string, userId: string, question: string) {
  // 1. Check lesson tồn tại + user có enrollment
  // 2. Insert AiJob { type: RAG_ASK, status: PROCESSING, lessonId, requestedBy: userId }
  // 3. Embed question
  // 4. VectorStoreService.searchSimilar(embedding, { lessonId, topK: AI_TOP_K })
  // 5. Build prompt với context từ chunks
  // 6. LlmService.chatCompletion(...)
  // 7. Update AiJob { status: COMPLETED, tokenInput, tokenOutput, latencyMs, model }
  // 8. Return { answer, sources }
  // On error: Update AiJob { status: FAILED, error }
}
```

> **Quan trọng:** RAG_ASK KHÔNG qua BullMQ — đây là sync request, chỉ dùng AiJob như log.

---

## PHASE 3 — Quiz Gen trong Quiz Module (~1h)

### Step 3.1 — QuizGenProcessor

**File:** `src/modules/quiz/processors/quiz-gen.processor.ts`

```typescript
@Processor('quiz-generation')
export class QuizGenProcessor {
  @Process()
  async handleGenerate(job: Job<{ lessonId: string; aiJobId: string; requestedBy: string }>) {
    // 1. Update AiJob status = PROCESSING
    // 2. Lấy lesson
    // 3. Build context (lessonDesc + textContent)
    // 4. ChunkingService để truncate nếu cần
    // 5. LlmService.chatCompletion({ responseFormat: 'json', model: 'strong' })
    // 6. Validate output (min 3 câu, mỗi câu có đúng 1 correct answer, min 4 options)
    // 7. Lưu QuizDraft { status: DRAFT_AI, rawOutput, validatedOutput }
    // 8. Update AiJob { status: COMPLETED, tokenInput, tokenOutput }
    // On error: Update AiJob { status: FAILED, error }
  }
}
```

**Quiz JSON schema yêu cầu từ LLM:**

```json
{
  "questions": [
    {
      "question": "string (min 10 chars)",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ]
}
```

**Validation tối thiểu (bắt buộc):**

- `questions.length >= 3`
- Mỗi câu có đúng 1 `correctIndex` hợp lệ
- Mỗi câu có ít nhất 4 options

---

### Step 3.2 — Draft endpoints

**Controller:** `src/modules/quiz/quiz.controller.ts`

```
POST   /quiz/lessons/:id/generate-ai     → enqueue QuizGenProcessor job
GET    /quiz/lessons/:id/drafts          → list QuizDrafts của lesson (CM only)
GET    /quiz/drafts/:draftId             → get 1 draft chi tiết
PATCH  /quiz/drafts/:draftId/publish     → publish draft (DRAFT_AI → PUBLISHED)
PATCH  /quiz/drafts/:draftId/reject      → reject draft (DRAFT_AI → REJECTED)
```

**generate-ai logic:**

```typescript
async generateAiQuiz(lessonId: string, userId: string) {
  // Check lesson tồn tại + user là course creator
  // Check đã có DRAFT_AI chưa → 409 Conflict nếu có
  // Insert AiJob { type: QUIZ_GENERATION, status: QUEUED, lessonId, requestedBy: userId }
  // Enqueue job với jobId = "quizgen:" + lessonId + ":" + Date.now()
  // Return { jobId: aiJob.id }
}
```

**publish logic:**

- `DRAFT_AI → PUBLISHED`: xóa quiz cũ của lesson (REPLACE strategy), tạo quiz mới từ `validatedOutput`
- `DRAFT_AI → REJECTED`: update status, ghi `reviewNote`

---

## Smoke test thủ công (cuối sprint)

| Endpoint                             | Test                                            |
| ------------------------------------ | ----------------------------------------------- |
| `POST /lesson/:id/ask`               | Gửi câu hỏi → nhận answer + sources             |
| `POST /quiz/lessons/:id/generate-ai` | Trigger job → kiểm tra AiJob QUEUED             |
| `GET /quiz/lessons/:id/drafts`       | Sau khi job COMPLETED → thấy QuizDraft DRAFT_AI |
| `PATCH /quiz/drafts/:id/publish`     | Draft → PUBLISHED, quiz cũ bị replace           |

---

## Quyết định KEY (đã chốt)

1. **LLM Provider:** OpenRouter (`https://openrouter.ai/api/v1`), model mặc định `openai/gpt-4o-mini` (chat) + `openai/text-embedding-3-small` (embedding)
2. **Context source:** `lessonDesc` + `textContent`. KHÔNG fetch YouTube transcript trong sprint này.
3. **RAG scope:** Lesson-only. Câu hỏi chỉ search trong chunks của đúng lesson đang xem.
4. **AiJob:** Dùng chung 1 bảng cho tất cả LLM call (LESSON_INDEX + QUIZ_GENERATION + RAG_ASK)
5. **Quiz publish strategy:** REPLACE (xóa quiz cũ, tạo mới từ draft)
6. **IVFFlat index:** DEFER — sequential scan OK cho dev/staging

---

## Phase tương lai (ngoài scope sprint)

- **Phase FE:** AI Chat Box (learner) + Generate Quiz UI (CMS)
- **Phase Test:** Unit + integration + E2E + performance
- **Phase Edge:** 5.5.x hardening đầy đủ
- **Phase 6:** Transcribe Cloudflare/Self-hosted video qua OpenRouter Transcription API
- **Phase 7:** Cross-lesson RAG search
