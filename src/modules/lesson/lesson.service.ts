import { Injectable } from '@nestjs/common'
import { CreateLessonBodyType, ReorderLessonDto, UpdateLessonBodyType } from './lesson.model'
import { LessonRepo } from './lesson.repo'
import { LessonStrategyRegistry } from './strategies/lesson-strategy.registry'
// import { QuizService } from '../quiz/quiz-cms.service'

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly registry: LessonStrategyRegistry,
  ) {}

  // private async validateChapterAuthor(chapterId: string, userId: string) {
  //   const chapter = await this.lessonRepo.findChapterWithAuthorId({
  //     id: chapterId,
  //     authorId: userId,
  //   })
  //   if (!chapter) {
  //     throw new BadRequestException('Chapter not found or you are not the author of this chapter')
  //   }
  //   return chapter
  // }

  async createLesson(body: CreateLessonBodyType) {
    // await this.validateChapterAuthor(chapterId, userId)

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
    // const course = await this.lessonRepo.getCourseUnique({ creatorId, id: body.courseId })
    // if (!course) throw new CourseNotFoundException()
    const prevLesson = await this.lessonRepo.findLessonOrder(body.prevLessonId)
    const nextLesson = await this.lessonRepo.findLessonOrder(body.nextLessonId)
    const newOrder = this.calculateNewOrder(prevLesson?.order ?? null, nextLesson?.order ?? null)
    const data = await this.lessonRepo.updateLessonOrder(body.lessonId, newOrder, body.targetChapterId)
    return data
  }

  updateLesson(lessonId: string, body: UpdateLessonBodyType) {
    return this.lessonRepo.updateLesson(lessonId, body)
  }
}
