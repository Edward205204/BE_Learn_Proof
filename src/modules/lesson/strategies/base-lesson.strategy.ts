import { Injectable } from '@nestjs/common'
import { LessonRepo } from '../lesson.repo'

@Injectable()
export class BaseLessonStrategy {
  constructor(private readonly lessonRepo: LessonRepo) {}

  async getNextOrder(chapterId: string) {
    const lastOrder = await this.lessonRepo.getLastLessonOrderInChapter(chapterId)
    return lastOrder + 1
  }
}
