import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { LessonStrategy } from './lesson.strategy.interface'
import { Injectable } from '@nestjs/common'
import { CreateLessonBodyType, LessonType } from '../lesson.model'
import { LessonRepo } from '../lesson.repo'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { Transactional } from '@nestjs-cls/transactional'
import { LessonDetailRaw, QuizLessonDetailResponse } from '../lesson.response'

@Injectable()
export class QuizLessonStrategy implements LessonStrategy {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly baseLessonStrategy: BaseLessonStrategy,
    private readonly quizCmsService: QuizCmsService,
  ) {}

  @Transactional()
  async create(data: CreateLessonBodyType) {
    const order = await this.baseLessonStrategy.getNextOrder(data.chapterId)
    const lesson = await this.lessonRepo.createLesson({
      type: LessonType.QUIZ,
      chapterId: data.chapterId,
      title: data.title,
      shortDesc: data?.shortDesc ?? null,
      order: order,
      videoId: null,
      provider: null,
      duration: null,
      textContent: null,
      videoKey: null,
    })
    if (data?.quizData?.length) {
      await this.quizCmsService.createQuiz({ lessonId: lesson.id, quizData: data.quizData })
    } else {
      await this.quizCmsService.createEmptyQuiz(lesson.id)
    }
    return lesson
  }

  async get(lesson: LessonDetailRaw): Promise<QuizLessonDetailResponse> {
    const quiz = await this.quizCmsService.getQuizByLessonId(lesson.id)
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
}
