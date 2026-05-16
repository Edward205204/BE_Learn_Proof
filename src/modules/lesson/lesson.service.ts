import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
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

const MIN_STUDY_SECONDS = 3 * 60 // 3 phút

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
  ) {}

  async createLesson(body: CreateLessonBodyType, userId: string) {
    const chapter = await this.lessonRepo.findChapterWithAuthorId({ id: body.chapterId, authorId: userId })
    if (!chapter) {
      throw new ForbiddenException('Chương học không tồn tại hoặc bạn không có quyền thao tác trên khóa học này')
    }

    const lessonStrategy = this.registry.resolve(body.type)
    const result = await lessonStrategy.create(body)

    await this.lessonIndexingQueue.add('index', { lessonId: result.id }, { jobId: `index:${result.id}:${Date.now()}` })

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

  async updateLesson(lessonId: string, body: UpdateLessonBodyType) {
    const result = await this.lessonRepo.updateLesson(lessonId, body)

    await this.lessonIndexingQueue.add('index', { lessonId: result.id }, { jobId: `index:${result.id}:${Date.now()}` })

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

  async askLesson(lessonId: string, userId: string, question: string) {
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

    const aiJob = await this.prisma.aiJob.create({
      data: {
        type: AiJobType.RAG_ASK,
        status: AiJobStatus.PROCESSING,
        lessonId,
        requestedBy: userId,
      },
    })

    try {
      const questionEmbedding = await this.embeddingService.generateEmbedding(question)
      const topKChunks = await this.vectorStoreService.searchSimilar(questionEmbedding, { lessonId, topK: 5 })
      const context = topKChunks.map((c) => c.content).join('\n\n')

      const template = this.promptTemplateService.getTemplate('rag_answer_v1')
      const systemPrompt = template.systemPrompt
      const userPrompt = this.promptTemplateService.render(template.userTemplate, {
        lessonTitle: lesson.title,
        targetLevel: lesson.targetLevel || 'BEGINNER',
        context,
        question,
      })

      const response = await this.llmService.chatCompletion({
        systemPrompt,
        userPrompt,
        model: 'cheap',
      })

      await this.prisma.aiJob.update({
        where: { id: aiJob.id },
        data: {
          status: AiJobStatus.COMPLETED,
          tokenInput: response.inputTokens,
          tokenOutput: response.outputTokens,
          latencyMs: response.latencyMs,
          model: response.model,
        },
      })

      return {
        answer: response.content,
        sources: topKChunks.map((c) => ({ content: c.content, score: c.score })),
      }
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

  async generateLessonContent(lessonId: string, userId: string, keywords?: string) {
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

    const template = this.promptTemplateService.getTemplate('lesson_content_gen_v1')
    const systemPrompt = template.systemPrompt
    const userPrompt = this.promptTemplateService.render(template.userTemplate, {
      lessonTitle: lesson.title,
      targetLevel: lesson.targetLevel || 'BEGINNER',
      keywords: keywords || 'None',
    })

    const response = await this.llmService.chatCompletion({
      systemPrompt,
      userPrompt,
      model: 'strong',
    })

    return {
      content: response.content,
    }
  }
}
