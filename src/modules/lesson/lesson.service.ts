import { Injectable } from '@nestjs/common'
import { CreateLessonBodyType, ReorderLessonDto, UpdateLessonBodyType } from './lesson.model'
import { LessonType } from 'src/generated/prisma/enums'
import { LessonRepo } from './lesson.repo'
import { LessonStrategyRegistry } from './strategies/lesson-strategy.registry'
import { LessonNotFoundException } from './error.model'
import { QuizLearnerService } from '../quiz/quiz-learner.service'

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly registry: LessonStrategyRegistry,
    private readonly quizLearnerService: QuizLearnerService,
  ) {}

  async createLesson(body: CreateLessonBodyType) {
    // check quyền sở hữu
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
    // check quyền sở hữu
    const prevLesson = await this.lessonRepo.findLessonOrder(body.prevLessonId)
    const nextLesson = await this.lessonRepo.findLessonOrder(body.nextLessonId)
    const newOrder = this.calculateNewOrder(prevLesson?.order ?? null, nextLesson?.order ?? null)
    const data = await this.lessonRepo.updateLessonOrder(body.lessonId, newOrder, body.targetChapterId)
    return data
  }

  updateLesson(lessonId: string, body: UpdateLessonBodyType) {
    return this.lessonRepo.updateLesson(lessonId, body)
  }

  async deleteLesson(lessonId: string) {
    // check quyền sở hữu
    await this.lessonRepo.deleteLesson(lessonId)
  }

  async getLessonDetail(lessonId: string) {
    const lesson = await this.lessonRepo.findLessonDetail(lessonId)
    if (!lesson) throw new LessonNotFoundException()

    const strategy = this.registry.resolve(lesson.type)
    return strategy.get(lesson)
  }

  async getLessonForLearner(lessonId: string) {
    const lesson = await this.lessonRepo.findLessonDetail(lessonId)
    if (!lesson) throw new LessonNotFoundException()

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
}
