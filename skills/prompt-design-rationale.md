# Prompt Design Rationale — Gemini 2.5 Flash (cheap model)

## Tại sao model cheap cần prompt khác model mạnh?

Model cheap (Flash, mini) có 2 điểm yếu chính cần compensate bằng prompt:

1. **Hay "sáng tạo" format** — tự ý wrap JSON trong `json...`, thêm preamble, bỏ field
2. **Instruction decay** — quên rule ở cuối prompt khi context dài

Cả 2 template đều được thiết kế để mitigate 2 vấn đề này.

---

## Template 1: `rag_answer_v1`

### Mục tiêu

Trả lời câu hỏi của learner chỉ dựa trên top-K chunks từ VectorStore, không hallucinate.

### Các quyết định thiết kế

**1. Vai trò cụ thể ngay câu đầu**

```
You are a teaching assistant for an online learning platform.
Your job: answer learner questions using ONLY the provided lesson context.
```

Model cheap cần anchor rõ ràng — không nên để model tự suy ra vai trò từ context.

**2. `<context>` tag bọc dữ liệu**

```xml
<context>
{{context}}
</context>
```

Delimiter rõ ràng giúp model phân biệt "instruction" vs "dữ liệu inject". Quan trọng để tránh prompt injection từ nội dung lesson.

**3. Fallback cứng (hardcoded string)**

```
If the context does not contain enough information, reply exactly:
{"answer":"Nội dung bài học chưa đề cập đến câu hỏi này.","sources":[]}
```

Không nói "apologize" hay "say you don't know" — model cheap hay diễn giải tự do. Cung cấp exact string để parse không bị lỗi.

**4. Negative instruction ngay sau positive**

```
Use ONLY information from <context>. Do NOT use outside knowledge.
```

Đặt KHÔNG làm gì ngay cạnh LÀM gì — model cheap hay quên nếu để negative instruction ở cuối block dài.

**5. Output schema với example field**

```json
{
  "answer": "<your answer here>",
  "sources": ["<short quote or phrase from context...>"]
}
```

Mô tả bằng ví dụ inline tốt hơn là mô tả abstract ("sources là mảng string trích từ context").

**6. Sources cap = 3, max 80 chars mỗi source**
Giới hạn cứng để tránh model dump toàn bộ context vào sources — tiết kiệm output token.

**7. Không dùng `responseFormat: 'json_object'` alone**
Phải kết hợp instruction trong system prompt + `response_format` ở API level. Model cheap đôi khi ignore `response_format` nếu system prompt không nhấn mạnh.

---

## Template 2: `quiz_gen_v1`

### Mục tiêu

Sinh đúng N câu hỏi trắc nghiệm, đúng format JSON, validate được ngay.

### Các quyết định thiết kế

**1. `{{questionCount}}` xuất hiện trong CẢ system prompt lẫn user prompt**

```
# System: Generate exactly {{questionCount}} questions. No more, no less.
# User:   Generate {{questionCount}} multiple-choice questions for this lesson.
```

Model cheap hay ignore instruction "exactly N" nếu chỉ nhắc 1 lần. Repeat ở 2 vị trí tăng compliance.

**2. Liệt kê constraint theo dạng số đếm**

```
- exactly 4 answer options (A, B, C, D)
- exactly 1 correct answer
- exactly {{questionCount}} questions
```

"Exactly" + số cụ thể tốt hơn "make sure" hay "ensure" với model cheap.

**3. Cấm "All of the above" / "None of the above"**
Model cheap hay sinh distractor kiểu này vì lazy — thêm explicit ban.

**4. correctIndex là 0-based, giải thích rõ**

```
correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)
```

Không giải thích → model hay trả về 1-based hoặc trả về letter "A"/"B" thay vì số.

**5. Fallback error trả về `questions: []` thay vì throw**

```json
{ "questions": [], "error": "Nội dung bài học không đủ để sinh câu hỏi." }
```

Validator trong `QuizGenProcessor` check `questions.length >= 3`, nếu `[]` → AiJob FAILED với message rõ. Tránh model sinh câu hỏi bịa khi content quá ngắn.

**6. `<lesson_content>` tag tách biệt với `lessonDesc`**

```
Description: {{lessonDesc}}

<lesson_content>
{{context}}
</lesson_content>
```

`lessonDesc` là meta context (ngắn, luôn có) — đặt ngoài tag để model đọc trước.
`context` là full content (có thể dài, đã truncate) — bọc trong tag.

**7. "Distractors must be plausible but clearly wrong"**
Instruction về chất lượng distractor — nếu không có, model cheap hay sinh distractor quá obvious (A đúng, B/C/D vô nghĩa).

---

## Lưu ý khi dùng với Gemini 2.5 Flash qua OpenRouter

### API call cần thiết lập

```typescript
// Cả 2 template đều gọi với responseFormat: 'json'
LlmService.chatCompletion({
  systemPrompt,
  userPrompt,
  responseFormat: 'json', // → force response_format: { type: 'json_object' }
  model: 'cheap', // → LLM_CHAT_MODEL_CHEAP env
  maxTokens: 1000, // RAG answer: 1000 đủ
  // maxTokens: 2000,       // Quiz gen 5 câu: ~1500-2000 token output
})
```

### Strip fence trước khi parse (bắt buộc với Gemini)

Gemini hay wrap output trong `json...` dù đã set `response_format`. `LlmService` phải strip trước khi JSON.parse:

````typescript
const clean = content
  .replace(/^```json\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim()
const parsed = JSON.parse(clean)
````

### Context size budget

- RAG: top-5 chunks × ~500 words = ~2500 words context → ~3500 tokens input. Trong budget của Flash.
- Quiz gen: truncate `context` về `AI_MAX_INPUT_TOKENS` chars (~4000 chars ≈ 1000 tokens). Lesson dài → chỉ lấy phần đầu.

### Không cần temperature tuning

- RAG: default temperature (0.7-1.0) OK — câu trả lời cần tự nhiên
- Quiz gen: nên set `temperature: 0.8` để distractor có variety, không bị repetitive

---

## Checklist khi nâng version template

Khi update `rag_answer_v1` → `rag_answer_v2`:

- [ ] Bump version string trong code
- [ ] Test với ít nhất 10 câu hỏi mẫu trên nội dung lesson thật
- [ ] So sánh `sources` quality — có trích đúng từ context không?
- [ ] AiJob lưu `promptVersion` → có thể query để compare v1 vs v2 sau này
