// ---------------------------------------------------------------------------
// ai.module.ts — đăng ký 3 service vào Adapter layer
// ---------------------------------------------------------------------------

import { Module } from '@nestjs/common'
import { LlmService } from './llm.service'
import { EmbeddingService } from './embedding.service'
import { PromptTemplateService } from './prompt-template.service'

@Module({
  providers: [LlmService, EmbeddingService, PromptTemplateService],
  exports: [LlmService, EmbeddingService, PromptTemplateService],
})
export class AiModule {}

// ---------------------------------------------------------------------------
// shared.module.ts (hoặc thêm vào SharedModule hiện có)
// Đăng ký VectorStoreService vào Shared layer
// ---------------------------------------------------------------------------

// import { Module, Global } from '@nestjs/common'
// import { VectorStoreService } from './services/vector-store.service'
// import { ChunkingService } from './services/chunking.service'
//
// @Global()
// @Module({
//   providers: [VectorStoreService, ChunkingService],
//   exports: [VectorStoreService, ChunkingService],
// })
// export class SharedModule {}

// ---------------------------------------------------------------------------
// USAGE: LessonService.askLesson()
// Copy đoạn này vào lesson.service.ts
// ---------------------------------------------------------------------------

/*
import { LlmService } from 'src/modules/ai/llm.service'
import { EmbeddingService } from 'src/modules/ai/embedding.service'
import { PromptTemplateService } from 'src/modules/ai/prompt-template.service'
import { VectorStoreService } from 'src/shared/services/vector-store.service'

async askLesson(lessonId: string, userId: string, question: string) {
  // 1. Guard
  const lesson = await this.prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } })
  // TODO: check enrollment

  // 2. Log AiJob (sync — không qua BullMQ)
  const aiJob = await this.prisma.aiJob.create({
    data: { type: 'RAG_ASK', status: 'PROCESSING', lessonId, requestedBy: userId },
  })

  const start = Date.now()
  try {
    // 3. Embed câu hỏi
    const queryEmbedding = await this.embeddingService.generateEmbedding(question)

    // 4. Tìm chunks liên quan
    const chunks = await this.vectorStoreService.searchSimilar(queryEmbedding, {
      lessonId,
      topK: 5,
      minScore: 0.3,   // bỏ chunk quá xa
    })

    // 5. Fallback nếu chưa index
    const context = chunks.length > 0
      ? chunks.map(c => c.content).join('\n\n')
      : lesson.lessonDesc ?? ''   // fallback dùng desc

    // 6. Build prompt + call LLM
    const prompt = this.promptSvc.build('rag_answer_v1', {
      lessonTitle: lesson.title,
      targetLevel: lesson.targetLevel ?? 'BEGINNER',
      context,
      question,
    })

    const result = await this.llmService.chatCompletion({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      responseFormat: 'json',
      model: 'cheap',
      maxTokens: 800,
    })

    // 7. Parse response
    const parsed: { answer: string; sources: string[] } = JSON.parse(result.content)

    // 8. Update AiJob
    await this.prisma.aiJob.update({
      where: { id: aiJob.id },
      data: {
        status: 'COMPLETED',
        model: result.model,
        tokenInput: result.inputTokens,
        tokenOutput: result.outputTokens,
        latencyMs: result.latencyMs,
        promptVersion: prompt.version,
      },
    })

    return {
      answer: parsed.answer,
      sources: parsed.sources ?? [],
      latencyMs: result.latencyMs,
    }

  } catch (err) {
    await this.prisma.aiJob.update({
      where: { id: aiJob.id },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      },
    })
    throw err
  }
}
*/

// ---------------------------------------------------------------------------
// USAGE: QuizGenProcessor.handleGenerate()
// Copy đoạn này vào quiz-gen.processor.ts
// ---------------------------------------------------------------------------

/*
async handleGenerate(job: Job<{ lessonId: string; aiJobId: string }>) {
  const { lessonId, aiJobId } = job.data

  await this.prisma.aiJob.update({
    where: { id: aiJobId },
    data: { status: 'PROCESSING' },
  })

  const start = Date.now()
  try {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } })

    // Build context (textContent ưu tiên, fallback lessonDesc)
    const rawContext = [lesson.textContent, lesson.lessonDesc].filter(Boolean).join('\n\n')
    const context = this.chunkingService.truncate(rawContext, 12000) // ~3000 tokens

    const QUESTION_COUNT = '5'

    const prompt = this.promptSvc.build('quiz_gen_v1', {
      lessonTitle: lesson.title,
      targetLevel: lesson.targetLevel ?? 'BEGINNER',
      lessonDesc: lesson.lessonDesc ?? '',
      context,
      questionCount: QUESTION_COUNT,
    })

    const result = await this.llmService.chatCompletion({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      responseFormat: 'json',
      model: 'cheap',       // Flash đủ cho quiz gen
      maxTokens: 2000,
    })

    const parsed: {
      questions: {
        question: string
        options: string[]
        correctIndex: number
        explanation: string
      }[]
      error?: string
    } = JSON.parse(result.content)

    // Validate tối thiểu
    if (!parsed.questions || parsed.questions.length < 3) {
      throw new Error(parsed.error ?? `AI sinh thiếu câu hỏi: ${parsed.questions?.length ?? 0}`)
    }
    for (const q of parsed.questions) {
      if (q.options.length < 4) throw new Error(`Câu hỏi thiếu options: "${q.question}"`)
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error(`correctIndex không hợp lệ: "${q.question}"`)
      }
    }

    // Lưu draft
    await this.prisma.$transaction([
      this.prisma.quizDraft.create({
        data: {
          lessonId,
          aiJobId,
          status: 'DRAFT_AI',
          rawOutput: parsed as any,
          validatedOutput: parsed as any,
          promptVersion: prompt.version,
        },
      }),
      this.prisma.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: 'COMPLETED',
          model: result.model,
          tokenInput: result.inputTokens,
          tokenOutput: result.outputTokens,
          latencyMs: Date.now() - start,
          promptVersion: prompt.version,
        },
      }),
    ])

  } catch (err) {
    await this.prisma.aiJob.update({
      where: { id: aiJobId },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      },
    })
    throw err  // BullMQ sẽ retry
  }
}
*/
