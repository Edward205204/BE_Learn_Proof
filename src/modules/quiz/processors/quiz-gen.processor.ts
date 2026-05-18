import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'
import { AiJobStatus, AiJobType, QuizDraftStatus } from 'src/generated/prisma/enums'
import { LlmService } from 'src/modules/ai/llm.service'
import { PromptTemplateService } from 'src/modules/ai/prompt-template.service'
import { ChunkingService } from 'src/shared/services/chunking.service'
import { AiQuizOutputSchema } from '../quiz.model'

@Processor('quiz-generation')
export class QuizGenProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizGenProcessor.name)
  private readonly questionStyles = [
    { key: 'definition', label: 'Câu hỏi định nghĩa / khái niệm' },
    { key: 'purpose', label: 'Câu hỏi mục đích / dùng để làm gì' },
    { key: 'mechanism', label: 'Câu hỏi cơ chế / hoạt động thế nào' },
    { key: 'advantage', label: 'Câu hỏi ưu điểm / lợi ích' },
    { key: 'limitation', label: 'Câu hỏi nhược điểm / hạn chế' },
    { key: 'comparison', label: 'Câu hỏi so sánh / phân biệt' },
    { key: 'scenario', label: 'Câu hỏi tình huống / ứng dụng' },
    { key: 'example', label: 'Câu hỏi ví dụ / minh hoạ' },
  ] as const

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>,
    private readonly llmService: LlmService,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly chunkingService: ChunkingService,
  ) {
    super()
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private tokenize(value: string): string[] {
    const normalized = this.normalizeText(value)
    if (!normalized) return []
    return normalized.split(' ').filter(Boolean)
  }

  private detectQuestionStyle(question: string): string {
    const text = this.normalizeText(question)
    if (!text) return 'unknown'

    if (/(la gi|what is|what are|is what|define|dinh nghia)/.test(text)) return 'definition'
    if (/(dung de lam gi|used for|use case|ung dung|ap dung)/.test(text)) return 'purpose'
    if (/(hoat dong nhu the nao|how does|how do|co che|cach thuc)/.test(text)) return 'mechanism'
    if (/(uu diem|loi ich|benefit|advantage|tai sao nen)/.test(text)) return 'advantage'
    if (/(nhuoc diem|han che|disadvantage|drawback|rui ro)/.test(text)) return 'limitation'
    if (/(so sanh|phan biet|khac gi|difference|compare)/.test(text)) return 'comparison'
    if (/(tinh huong|scenario|truong hop|khi nao|khi nao nen)/.test(text)) return 'scenario'
    if (/(vi du|example|minh hoa|illustrate)/.test(text)) return 'example'
    return 'unknown'
  }

  private getMissingStyles(existingQuestions: string[]) {
    const used = new Set(existingQuestions.map((question) => this.detectQuestionStyle(question)))
    return this.questionStyles.filter((style) => !used.has(style.key)).map((style) => style.label)
  }

  private similarity(a: string, b: string): number {
    const aTokens = new Set(this.tokenize(a))
    const bTokens = new Set(this.tokenize(b))
    if (aTokens.size === 0 || bTokens.size === 0) return 0

    let intersection = 0
    for (const token of aTokens) {
      if (bTokens.has(token)) intersection++
    }

    const union = new Set([...aTokens, ...bTokens]).size
    return union === 0 ? 0 : intersection / union
  }

  private isTooSimilar(candidate: string, references: string[]) {
    const normalizedCandidate = this.normalizeText(candidate)
    if (!normalizedCandidate) return true

    return references.some((reference) => {
      const normalizedReference = this.normalizeText(reference)
      if (!normalizedReference) return false
      if (normalizedCandidate === normalizedReference) return true
      if (normalizedCandidate.includes(normalizedReference) || normalizedReference.includes(normalizedCandidate)) {
        return true
      }
      return this.similarity(candidate, reference) >= 0.45
    })
  }

  private filterUniqueQuestions(questions: any[], existingQuestions: string[]) {
    const unique: any[] = []
    const seen = new Set<string>()
    const existingStyles = new Set(existingQuestions.map((question) => this.detectQuestionStyle(question)))

    for (const question of questions) {
      const normalizedQuestion = this.normalizeText(question.question || '')
      if (!normalizedQuestion || seen.has(normalizedQuestion)) continue
      if (this.isTooSimilar(question.question || '', existingQuestions)) continue
      if (existingStyles.has(this.detectQuestionStyle(question.question || ''))) continue
      if (unique.some((item) => this.isTooSimilar(question.question || '', [item.question || '']))) continue

      seen.add(normalizedQuestion)
      unique.push(question)
    }

    return unique
  }

  private async generateQuizDraft(params: {
    template: ReturnType<PromptTemplateService['getTemplate']>
    lessonTitle: string
    targetLevel: string
    outputLanguage: string
    lessonDesc: string
    context: string
    existingQuestions: string
    avoidQuestions: string
    coveragePlan: string
    questionCount: string
  }) {
    const userPrompt = this.promptTemplateService.render(params.template.userTemplate, {
      lessonTitle: params.lessonTitle,
      targetLevel: params.targetLevel,
      lessonDesc: params.lessonDesc,
      context: params.context,
      existingQuestions: params.existingQuestions,
      avoidQuestions: params.avoidQuestions,
      coveragePlan: params.coveragePlan,
      questionCount: params.questionCount,
    })

    const llmResult = await this.llmService.chatCompletion({
      systemPrompt: params.template.systemPrompt,
      userPrompt,
      responseFormat: 'json',
      model: 'strong',
    })

    const parsed = JSON.parse(llmResult.content)
    const validation = AiQuizOutputSchema.safeParse(parsed)
    if (!validation.success) {
      throw new Error(validation.error.issues[0]?.message || 'Invalid quiz output')
    }

    return {
      questions: validation.data.questions,
      llmResult,
    }
  }

  async process(job: Job<{ lessonId: string; aiJobId: string; requestedBy: string; language?: 'vi' | 'en' }>): Promise<any> {
    const { lessonId, aiJobId, language = 'vi' } = job.data

    try {
      await this.txHost.tx.aiJob.update({
        where: { id: aiJobId },
        data: { status: AiJobStatus.PROCESSING, type: AiJobType.QUIZ_GENERATION },
      })

      const lesson = await this.txHost.tx.lesson.findUnique({
        where: { id: lessonId },
        select: {
          id: true,
          title: true,
          shortDesc: true,
          lessonDesc: true,
          textContent: true,
          transcript: true,
          targetLevel: true,
        },
      })

      if (!lesson) {
        throw new Error('Lesson not found')
      }

      const existingQuiz = await this.txHost.tx.quiz.findFirst({
        where: { lessonId },
        select: {
          questions: {
            orderBy: { createdAt: 'asc' },
            select: {
              content: true,
            },
          },
        },
      })

      const existingQuestionsList = existingQuiz?.questions?.map((question) => question.content) || []
      const existingQuestions =
        existingQuestionsList.length > 0
          ? existingQuestionsList.slice(0, 20).map((question, index) => `${index + 1}. ${question}`).join('\n')
          : 'None'
      const existingQuestionsTail =
        existingQuestionsList.length > 20 ? `\n... and ${existingQuestionsList.length - 20} more questions` : ''

      // Build context
      const fullContext = this.chunkingService.buildContext(lesson)
      const context = fullContext.length > 12000 ? fullContext.slice(0, 12000) : fullContext

      const template = this.promptTemplateService.getTemplate('quiz_gen_v1')
      const outputLanguage = this.promptTemplateService.getOutputLanguageLabel(language)
      const avoidQuestions = `${existingQuestions}${existingQuestionsTail}`
      const coveragePlan = this.getMissingStyles(existingQuestionsList)
        .slice(0, 5)
        .join(', ')
        || 'definition, purpose, mechanism, advantage, scenario'
      let generatedQuestions: any[] = []
      let llmResult:
        | { content: string; inputTokens: number; outputTokens: number; model: string; latencyMs: number }
        | null = null
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= 2; attempt++) {
        const result = await this.generateQuizDraft({
          template,
          lessonTitle: lesson.title,
          targetLevel: lesson.targetLevel || 'BEGINNER',
          outputLanguage,
          lessonDesc: lesson.lessonDesc || '',
          context,
          existingQuestions: avoidQuestions,
          avoidQuestions: attempt === 1 ? 'None' : avoidQuestions,
          coveragePlan,
          questionCount: '5',
        })

        llmResult = result.llmResult
        const filteredQuestions = this.filterUniqueQuestions(result.questions, existingQuestionsList)
        if (filteredQuestions.length >= 3) {
          generatedQuestions = filteredQuestions.slice(0, 5)
          break
        }

        lastError = new Error(
          `Generated questions are too similar to existing quiz questions. Attempt ${attempt}/2.`,
        )
        this.logger.warn(lastError.message)
      }

      if (!generatedQuestions.length) {
        throw lastError || new Error('Failed to generate sufficiently unique quiz questions')
      }

      if (!llmResult) {
        throw new Error('Missing LLM response for quiz generation')
      }

      // Save QuizDraft
      await this.txHost.tx.quizDraft.create({
        data: {
          lessonId,
          aiJobId,
          status: QuizDraftStatus.DRAFT_AI,
          rawOutput: generatedQuestions,
          validatedOutput: generatedQuestions,
          promptVersion: template.version,
        },
      })

      await this.txHost.tx.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: AiJobStatus.COMPLETED,
          tokenInput: llmResult.inputTokens,
          tokenOutput: llmResult.outputTokens,
          latencyMs: llmResult.latencyMs,
          model: llmResult.model,
        },
      })
      this.logger.log(`Quiz generation job completed for lesson ${lessonId}`)
    } catch (error: any) {
      this.logger.error(`Failed to process quiz generation for lesson ${lessonId}: ${error.message}`)
      await this.txHost.tx.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message,
          retries: job.attemptsMade,
        },
      })
      throw error
    }
  }
}
