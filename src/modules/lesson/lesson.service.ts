import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { CreateLessonBodyType, ReorderLessonDto, UpdateLessonBodyType } from './lesson.model'
import { LessonRepo } from './lesson.repo'
import { LessonStrategyRegistry } from './strategies/lesson-strategy.registry'
import { LessonNotFoundException } from './error.model'
import { QuizLearnerService } from '../quiz/quiz-learner.service'
import { Transactional } from '@nestjs-cls/transactional'
import { LessonType } from 'src/generated/prisma/enums'

const MIN_STUDY_SECONDS = 3 * 60 // 3 phút

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly registry: LessonStrategyRegistry,
    private readonly quizLearnerService: QuizLearnerService,
  ) {}

  async createLesson(body: CreateLessonBodyType, userId: string) {
    const chapter = await this.lessonRepo.findChapterWithAuthorId({ id: body.chapterId, authorId: userId })
    if (!chapter) {
      throw new ForbiddenException('Chương học không tồn tại hoặc bạn không có quyền thao tác trên khóa học này')
    }

    const lessonStrategy = this.registry.resolve(body.type)
    return lessonStrategy.create(body)
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

  updateLesson(lessonId: string, body: UpdateLessonBodyType) {
    return this.lessonRepo.updateLesson(lessonId, body)
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
}
