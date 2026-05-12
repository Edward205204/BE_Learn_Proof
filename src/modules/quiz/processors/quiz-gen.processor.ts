import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'
import { LlmService } from 'src/modules/ai/llm.service'
import { PromptTemplateService } from 'src/modules/ai/prompt-template.service'
import { ChunkingService } from 'src/shared/services/chunking.service'

@Processor('quiz-generation')
export class QuizGenProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizGenProcessor.name)

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>,
    private readonly llmService: LlmService,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly chunkingService: ChunkingService,
  ) {
    super()
  }

  async process(job: Job<{ lessonId: string; aiJobId: string; requestedBy: string }>): Promise<any> {
    const { lessonId, aiJobId, requestedBy } = job.data

    try {
      await this.txHost.tx.aiJob.update({
        where: { id: aiJobId },
        data: { status: 'PROCESSING' },
      })

      const lesson = await this.txHost.tx.lesson.findUnique({
        where: { id: lessonId },
      })

      if (!lesson) {
        throw new Error('Lesson not found')
      }

      // Build context
      const fullContext = this.chunkingService.buildContext(lesson)
      const chunks = this.chunkingService.splitText(fullContext, { chunkSize: 2000, overlap: 0 })
      const context = chunks.length > 0 ? chunks[0] : ''

      const template = this.promptTemplateService.getTemplate('quiz_gen_v1')
      const userPrompt = this.promptTemplateService.render(template.userTemplate, {
        lessonTitle: lesson.title,
        targetLevel: lesson.targetLevel || 'BEGINNER',
        lessonDesc: lesson.lessonDesc || '',
        context: context,
        questionCount: '5',
      })

      const llmResult = await this.llmService.chatCompletion({
        systemPrompt: template.systemPrompt,
        userPrompt: userPrompt,
        responseFormat: 'json',
        model: 'strong',
      })

      let questions: any[] = []
      try {
        const parsed = JSON.parse(llmResult.content)
        questions = parsed.questions || []
      } catch (err) {
        throw new Error('Failed to parse LLM output')
      }

      // Validate output
      if (questions.length < 3) {
        throw new Error('Quiz must contain at least 3 questions')
      }

      for (const q of questions) {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error('Each question must have exactly 4 options')
        }
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
          throw new Error('Invalid correctIndex')
        }
      }

      // Save QuizDraft
      await this.txHost.tx.quizDraft.create({
        data: {
          lessonId,
          aiJobId,
          status: 'DRAFT_AI',
          rawOutput: questions,
          validatedOutput: questions,
          promptVersion: template.version,
        },
      })

      await this.txHost.tx.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: 'COMPLETED',
          tokenInput: llmResult.inputTokens,
          tokenOutput: llmResult.outputTokens,
          latencyMs: llmResult.latencyMs,
        },
      })
      this.logger.log(`Quiz generation job completed for lesson ${lessonId}`)
    } catch (error: any) {
      this.logger.error(`Failed to process quiz generation for lesson ${lessonId}: ${error.message}`)
      await this.txHost.tx.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      })
      throw error
    }
  }
}
