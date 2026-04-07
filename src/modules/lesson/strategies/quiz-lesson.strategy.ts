import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { LessonStrategy } from './lesson.strategy.interface'
import { Injectable } from '@nestjs/common'
import { CreateLessonBodyType, LessonType } from '../lesson.model'
import { LessonRepo } from '../lesson.repo'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { Transactional } from '@nestjs-cls/transactional'

// lesson/strategies/quiz-lesson.strategy.ts
@Injectable()
export class QuizLessonStrategy implements LessonStrategy {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly baseLessonStrategy: BaseLessonStrategy,
    private readonly quizService: QuizCmsService,
  ) {}

  @Transactional()
  async create(data: CreateLessonBodyType) {
    const order = await this.baseLessonStrategy.getNextOrder(data.chapterId)
    const lesson = await this.lessonRepo.createLesson({
      type: LessonType.QUIZ,
      chapterId: data.chapterId,
      title: data.title,
      shortDesc: data?.shortDesc ?? null,
      fullDesc: data?.fullDesc ?? null,
      order: order,
      videoId: null,
      provider: null,
      duration: null,
      textContent: null,
    })
    if (data?.quizData) {
      await this.quizService.createQuiz({ lessonId: lesson.id, quizData: data.quizData })
    }
    return lesson
  }
}
