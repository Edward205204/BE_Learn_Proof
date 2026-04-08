import { Injectable } from '@nestjs/common'
import { CreateLessonBodyType, UpdateLessonBodyType } from './lesson.model'
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

  async

  updateLesson(lessonId: string, body: UpdateLessonBodyType) {
    return this.lessonRepo.updateLesson(lessonId, body)
  }
}
