import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateLessonBodyType, ReorderLessonDto, UpdateLessonBodyType } from './lesson.model'
import { LessonRepo } from './lesson.repo'
import { LessonStrategyRegistry } from './strategies/lesson-strategy.registry'
import { LessonNotFoundException } from './error.model'
import { QuizLearnerService } from '../quiz/quiz-learner.service'
import { Transactional } from '@nestjs-cls/transactional'
import { LessonType } from 'src/generated/prisma/enums'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from 'src/shared/services/prisma.service'
import { LlmService } from '../ai/llm.service'
import { EmbeddingService } from '../ai/embedding.service'
import { PromptTemplateService } from '../ai/prompt-template.service'
import { VectorStoreService } from 'src/shared/services/vector-store.service'
import { AiJobType, AiJobStatus } from 'src/generated/prisma/enums'
import type { AiOutputLanguage } from '../ai/prompt-template.service'

const MIN_STUDY_SECONDS = 3 * 60 // 3 phút
const LESSON_INDEXING_DELAY_MS = 2000

type RagAskResult = {
  answer: string
  sources: { content: string; score: number }[]
}

type LessonContentGenerationResult = {
  content: string
}

type LlmUsage = {
  inputTokens: number
  outputTokens: number
  model: string
  latencyMs: number
}

type RagLessonContext = {
  id: string
  title: string
  shortDesc: string | null
  lessonDesc: string | null
  textContent: string | null
  transcript: string | null
  targetLevel: string | null
}

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly registry: LessonStrategyRegistry,
    private readonly quizLearnerService: QuizLearnerService,
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly embeddingService: EmbeddingService,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly vectorStoreService: VectorStoreService,
    @InjectQueue('lesson-indexing') private readonly lessonIndexingQueue: Queue,
    @InjectQueue('lesson-ai') private readonly lessonAiQueue: Queue,
  ) {}

  private async enqueueLessonIndexing(lessonId: string, requestedBy: string) {
    let aiJob = await this.prisma.aiJob.findFirst({
      where: {
        lessonId,
        type: AiJobType.LESSON_INDEX,
        status: AiJobStatus.QUEUED,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!aiJob) {
      aiJob = await this.prisma.aiJob.create({
        data: {
          lessonId,
          requestedBy,
          type: AiJobType.LESSON_INDEX,
          status: AiJobStatus.QUEUED,
        },
      })
    }

    const stableJobId = `index_${lessonId}`
    let bullJobId = stableJobId
    const existingJob = await this.lessonIndexingQueue.getJob(stableJobId)

    if (existingJob) {
      const state = await existingJob.getState()
      if (state === 'active') {
        bullJobId = `index_${lessonId}_${aiJob.id}`
      } else {
        await existingJob.remove()
      }
    }

    await this.lessonIndexingQueue.add(
      'index',
      { lessonId, aiJobId: aiJob.id },
      { jobId: bullJobId, delay: LESSON_INDEXING_DELAY_MS },
    )

    return { jobId: aiJob.id }
  }

  async createLesson(body: CreateLessonBodyType, userId: string) {
    const chapter = await this.lessonRepo.findChapterWithAuthorId({ id: body.chapterId, authorId: userId })
    if (!chapter) {
      throw new ForbiddenException('Chương học không tồn tại hoặc bạn không có quyền thao tác trên khóa học này')
    }

    const lessonStrategy = this.registry.resolve(body.type)
    const result = await lessonStrategy.create(body)

    await this.enqueueLessonIndexing(result.id, userId)

    return result
  }

  private calculateNewOrder(prevOrder: number | null, nextOrder: number | null) {
    if (prevOrder !== null && nextOrder !== null) {
      return (prevOrder + nextOrder) / 2
    }
    if (prevOrder !== null) {
      return prevOrder + 100
    }
    if (nextOrder !== null) {
      return nextOrder / 2
    }
    return 1000
  }

  async reorderLesson(body: ReorderLessonDto) {
    const prevLesson = await this.lessonRepo.findLessonOrder(body.prevLessonId)
    const nextLesson = await this.lessonRepo.findLessonOrder(body.nextLessonId)
    const newOrder = this.calculateNewOrder(prevLesson?.order ?? null, nextLesson?.order ?? null)
    return this.lessonRepo.updateLessonOrder(body.lessonId, newOrder, body.targetChapterId)
  }

  async updateLesson(lessonId: string, body: UpdateLessonBodyType, userId: string) {
    const result = await this.lessonRepo.updateLesson(lessonId, body)

    await this.enqueueLessonIndexing(result.id, userId)

    return result
  }

  toggleLessonLock(lessonId: string, isLocked: boolean) {
    return this.lessonRepo.toggleLessonLock(lessonId, isLocked)
  }

  async deleteLesson(lessonId: string) {
    await this.lessonRepo.deleteLesson(lessonId)
  }

  async getLessonDetail(lessonId: string) {
    const lesson = await this.lessonRepo.findLessonDetail(lessonId)
    if (!lesson) throw new LessonNotFoundException()
    const strategy = this.registry.resolve(lesson.type)
    return strategy.get(lesson)
  }

  @Transactional()
  async getLessonForLearner(lessonId: string, userId: string) {
    const lesson = await this.lessonRepo.findLessonDetail(lessonId)
    if (!lesson) throw new LessonNotFoundException()

    // Kiểm tra nếu bài học bị khóa → phải hoàn thành tất cả bài trước
    if (lesson.isLocked) {
      const preceding = await this.lessonRepo.getLessonsPrecedingInCourse(lessonId)
      if (preceding.length > 0) {
        const completedIds = await this.lessonRepo.getCompletedLessonIds(
          userId,
          preceding.map((l) => l.id),
        )
        if (completedIds.length < preceding.length) {
          throw new ForbiddenException('Bạn cần hoàn thành tất cả các bài học trước đó để mở khóa bài học này')
        }
      }
    }

    // Ghi lại lần đầu học để tính 3 phút (chỉ tạo nếu chưa có)
    await this.lessonRepo.touchProgress(userId, lessonId)

    if (lesson.type === LessonType.QUIZ) {
      const quiz = await this.quizLearnerService.getQuizForLesson(lesson.id)
      return {
        id: lesson.id,
        title: lesson.title,
        shortDesc: lesson.shortDesc,
        type: 'QUIZ' as const,
        order: lesson.order,
        chapterId: lesson.chapterId,
        quiz,
      }
    }

    const strategy = this.registry.resolve(lesson.type)
    return strategy.get(lesson)
  }

  @Transactional()
  async markLessonComplete(userId: string, lessonId: string, courseId: string) {
    const enrolled = await this.lessonRepo.checkEnrolled(userId, courseId)
    if (!enrolled) throw new ForbiddenException('Bạn chưa đăng ký khóa học này')

    // Kiểm tra quy tắc 3 phút
    const progress = await this.lessonRepo.getProgress(userId, lessonId)
    if (progress) {
      const studiedSeconds = Math.floor((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
      if (studiedSeconds < MIN_STUDY_SECONDS) {
        const remaining = MIN_STUDY_SECONDS - studiedSeconds
        throw new BadRequestException(
          `Bạn cần học bài học này ít nhất 3 phút. Còn lại: ${Math.ceil(remaining / 60)} phút ${remaining % 60} giây.`,
        )
      }
    }

    await this.lessonRepo.upsertProgress(userId, lessonId)

    const { total, completed } = await this.lessonRepo.countCourseProgress(userId, courseId)
    return { lessonId, completed: true, courseCompleted: total > 0 && total === completed }
  }

  private async findLessonForRagAsk(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          select: { courseId: true },
        },
      },
    })
    if (!lesson) throw new LessonNotFoundException()

    const enrolled = await this.lessonRepo.checkEnrolled(userId, lesson.chapter.courseId)
    if (!enrolled) throw new ForbiddenException('Bạn chưa đăng ký khóa học này')

    return lesson
  }

  private async findLessonForContentGeneration(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            course: {
              select: { creatorId: true },
            },
          },
        },
      },
    })
    if (!lesson) throw new LessonNotFoundException()

    if (lesson.chapter.course.creatorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên bài học này')
    }

    return lesson
  }

  private async executeRagAsk(
    lesson: RagLessonContext,
    question: string,
    language: AiOutputLanguage,
  ): Promise<{ result: RagAskResult; usage: LlmUsage }> {
    const asksForTranscriptTime = this.isTranscriptTimeQuestion(question)

    if (asksForTranscriptTime && !lesson.transcript) {
      return {
        result: {
          answer:
            language === 'en'
              ? 'I do not have a transcript for this video content.'
              : 'Tôi không có transcript cho nội dung video này.',
          sources: [],
        },
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          model: 'rule-based',
        },
      }
    }

    const questionEmbedding = await this.embeddingService.generateEmbedding(question)
    const topKChunks = await this.vectorStoreService.searchSimilar(questionEmbedding, {
      lessonId: lesson.id,
      topK: 5,
      sourceIn: asksForTranscriptTime ? ['transcript'] : ['lesson_metadata', 'lesson_content'],
    })
    const context = topKChunks.map((chunk) => chunk.content).join('\n\n') || 'None'

    const template = this.promptTemplateService.getTemplate('rag_answer_v1')
    const systemPrompt = template.systemPrompt
    const userPrompt = this.promptTemplateService.render(template.userTemplate, {
      lessonTitle: lesson.title,
      targetLevel: lesson.targetLevel || 'BEGINNER',
      outputLanguage: this.promptTemplateService.getOutputLanguageLabel(language),
      context,
      answerGuidance: this.getRagAnswerGuidance(question, topKChunks.length, language),
      transcriptInstruction: asksForTranscriptTime
        ? 'The retrieved context is transcript-only. Use it to answer the timestamp/minute question. If it does not contain the answer, say you do not have enough information based on the transcript.'
        : 'The retrieved context excludes transcript content. Answer from lesson metadata and lesson content. Do not mention transcript unless the learner asked about video timing.',
      question,
    })

    const response = await this.llmService.chatCompletion({
      systemPrompt,
      userPrompt,
      model: 'cheap',
    })

    return {
      result: {
        answer: response.content,
        sources: topKChunks.map((chunk) => ({ content: chunk.content, score: chunk.score })),
      },
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        latencyMs: response.latencyMs,
        model: response.model,
      },
    }
  }

  private isTranscriptTimeQuestion(question: string) {
    const normalized = question
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    return /(\bphut\b|\bminute\b|\bmin\b|\btimestamp\b|\bmoc thoi gian\b|\bthoi diem\b|\btimecode\b|\b\d{1,2}:\d{2}\b|\b\d+\s*(phut|minute|min)\b)/.test(
      normalized,
    )
  }

  private getRagAnswerGuidance(question: string, contextCount: number, language: AiOutputLanguage) {
    if (contextCount === 0) {
      return language === 'en'
        ? 'No retrieved context was found. Use only the lesson title and target level. If that is not enough, say the lesson does not provide enough information.'
        : 'Không tìm thấy context liên quan. Chỉ dùng tiêu đề bài học và cấp độ mục tiêu. Nếu vẫn không đủ, hãy nói bài học chưa cung cấp đủ thông tin.'
    }

    const normalized = question
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const asksForDeepExplanation = /(giai thich|chi tiet|chuyen sau|tai sao|vi sao|how|why|explain|deep|detail|example|vi du)/.test(
      normalized,
    )

    if (asksForDeepExplanation) {
      return language === 'en'
        ? 'Give a mentor-style answer with enough depth: concept, reasoning, mechanism, example, and practical takeaway when useful.'
        : 'Trả lời theo phong cách mentor, đủ sâu: khái niệm, lý do, cơ chế hoạt động, ví dụ và takeaway thực tế nếu phù hợp.'
    }

    return language === 'en'
      ? 'Answer naturally. Be concise for simple questions, but add explanation when it helps the learner understand.'
      : 'Trả lời tự nhiên. Với câu hỏi đơn giản thì gọn, nhưng hãy giải thích thêm khi điều đó giúp người học hiểu bản chất.'
  }

  private async executeLessonContentGeneration(
    lesson: { title: string; targetLevel: string | null },
    keywords: string | undefined,
    language: AiOutputLanguage,
  ): Promise<{ result: LessonContentGenerationResult; usage: LlmUsage }> {
    const template = this.promptTemplateService.getTemplate('lesson_content_gen_v1')
    const systemPrompt = template.systemPrompt
    const userPrompt = this.promptTemplateService.render(template.userTemplate, {
      lessonTitle: lesson.title,
      targetLevel: lesson.targetLevel || 'BEGINNER',
      outputLanguage: this.promptTemplateService.getOutputLanguageLabel(language),
      keywords: keywords || 'None',
    })

    const response = await this.llmService.chatCompletion({
      systemPrompt,
      userPrompt,
      model: 'strong',
    })

    return {
      result: { content: response.content },
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        latencyMs: response.latencyMs,
        model: response.model,
      },
    }
  }

  async askLesson(lessonId: string, userId: string, question: string, language: AiOutputLanguage = 'vi') {
    const lesson = await this.findLessonForRagAsk(lessonId, userId)

    const aiJob = await this.prisma.aiJob.create({
      data: {
        type: AiJobType.RAG_ASK,
        status: AiJobStatus.PROCESSING,
        lessonId,
        requestedBy: userId,
      },
    })

    try {
      const { result, usage } = await this.executeRagAsk(lesson, question, language)

      await this.prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: AiJobStatus.COMPLETED,
          tokenInput: usage.inputTokens,
          tokenOutput: usage.outputTokens,
          latencyMs: usage.latencyMs,
          model: usage.model,
          result,
        },
      })

      return result
    } catch (error: any) {
      await this.prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message || 'Unknown error',
        },
      })
      throw error
    }
  }

  async askLessonAsync(lessonId: string, userId: string, question: string, language: AiOutputLanguage = 'vi') {
    await this.findLessonForRagAsk(lessonId, userId)

    const aiJob = await this.prisma.aiJob.create({
      data: {
        type: AiJobType.RAG_ASK,
        status: AiJobStatus.QUEUED,
        lessonId,
        requestedBy: userId,
      },
    })

    try {
      await this.lessonAiQueue.add(
        'rag-ask',
        { lessonId, aiJobId: aiJob.id, requestedBy: userId, question, language },
        { jobId: `rag_ask_${aiJob.id}`, attempts: 3 },
      )
    } catch (error: any) {
      await this.prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message || 'Failed to enqueue RAG ask job',
        },
      })
      throw error
    }

    return { jobId: aiJob.id }
  }

  async generateLessonContent(lessonId: string, userId: string, keywords?: string, language: AiOutputLanguage = 'vi') {
    const lesson = await this.findLessonForContentGeneration(lessonId, userId)
    const { result } = await this.executeLessonContentGeneration(lesson, keywords, language)
    return result
  }

  async generateLessonContentAsync(
    lessonId: string,
    userId: string,
    keywords?: string,
    language: AiOutputLanguage = 'vi',
  ) {
    await this.findLessonForContentGeneration(lessonId, userId)

    const aiJob = await this.prisma.aiJob.create({
      data: {
        type: AiJobType.LESSON_CONTENT_GENERATION,
        status: AiJobStatus.QUEUED,
        lessonId,
        requestedBy: userId,
      },
    })

    try {
      await this.lessonAiQueue.add(
        'lesson-content-generation',
        { lessonId, aiJobId: aiJob.id, requestedBy: userId, keywords, language },
        { jobId: `lesson_content_generation_${aiJob.id}`, attempts: 3 },
      )
    } catch (error: any) {
      await this.prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message || 'Failed to enqueue lesson content generation job',
        },
      })
      throw error
    }

    return { jobId: aiJob.id }
  }

  async processRagAskJob(params: {
    lessonId: string
    aiJobId: string
    question: string
    language?: AiOutputLanguage
    attemptsMade: number
  }) {
    try {
      await this.prisma.aiJob.update({
        where: { id: params.aiJobId },
        data: { status: AiJobStatus.PROCESSING, type: AiJobType.RAG_ASK, error: null },
      })

      const lesson = await this.prisma.lesson.findUnique({
        where: { id: params.lessonId },
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
      if (!lesson) throw new LessonNotFoundException()

      const { result, usage } = await this.executeRagAsk(lesson, params.question, params.language || 'vi')

      await this.prisma.aiJob.update({
        where: { id: params.aiJobId },
        data: {
          status: AiJobStatus.COMPLETED,
          tokenInput: usage.inputTokens,
          tokenOutput: usage.outputTokens,
          latencyMs: usage.latencyMs,
          model: usage.model,
          result,
        },
      })
    } catch (error: any) {
      await this.prisma.aiJob.update({
        where: { id: params.aiJobId },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message || 'Unknown error',
          retries: params.attemptsMade,
        },
      })
      throw error
    }
  }

  async processLessonContentGenerationJob(params: {
    lessonId: string
    aiJobId: string
    keywords?: string
    language?: AiOutputLanguage
    attemptsMade: number
  }) {
    try {
      await this.prisma.aiJob.update({
        where: { id: params.aiJobId },
        data: { status: AiJobStatus.PROCESSING, type: AiJobType.LESSON_CONTENT_GENERATION, error: null },
      })

      const lesson = await this.prisma.lesson.findUnique({
        where: { id: params.lessonId },
        select: { title: true, targetLevel: true },
      })
      if (!lesson) throw new LessonNotFoundException()

      const { result, usage } = await this.executeLessonContentGeneration(
        lesson,
        params.keywords,
        params.language || 'vi',
      )

      await this.prisma.aiJob.update({
        where: { id: params.aiJobId },
        data: {
          status: AiJobStatus.COMPLETED,
          tokenInput: usage.inputTokens,
          tokenOutput: usage.outputTokens,
          latencyMs: usage.latencyMs,
          model: usage.model,
          result,
        },
      })
    } catch (error: any) {
      await this.prisma.aiJob.update({
        where: { id: params.aiJobId },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message || 'Unknown error',
          retries: params.attemptsMade,
        },
      })
      throw error
    }
  }

  async getAiJob(jobId: string, userId: string) {
    const aiJob = await this.prisma.aiJob.findUnique({
      where: { id: jobId },
      include: {
        lesson: {
          select: {
            chapter: {
              select: {
                course: {
                  select: {
                    creatorId: true,
                    enrollments: {
                      where: { userId },
                      select: { id: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!aiJob) throw new NotFoundException('AI job không tồn tại')

    const course = aiJob.lesson.chapter.course
    const isRequester = aiJob.requestedBy === userId
    const isCourseOwner = course.creatorId === userId
    const isEnrolled = course.enrollments.length > 0

    if (aiJob.type === AiJobType.RAG_ASK) {
      if (!isRequester || !isEnrolled) throw new ForbiddenException('Bạn không có quyền xem AI job này')
    } else if (!isCourseOwner) {
      throw new ForbiddenException('Bạn không có quyền xem AI job này')
    }

    return {
      id: aiJob.id,
      type: aiJob.type,
      status: aiJob.status,
      lessonId: aiJob.lessonId,
      result: aiJob.result,
      error: aiJob.error,
      model: aiJob.model,
      tokenInput: aiJob.tokenInput,
      tokenOutput: aiJob.tokenOutput,
      latencyMs: aiJob.latencyMs,
      retries: aiJob.retries,
      createdAt: aiJob.createdAt,
      updatedAt: aiJob.updatedAt,
    }
  }
}
