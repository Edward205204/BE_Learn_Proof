import { Injectable } from '@nestjs/common'
import { LessonStrategy } from './lesson.strategy.interface'
import { CreateLessonBodyType, LessonType } from '../lesson.model'
import { LessonRepo } from '../lesson.repo'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { Transactional } from '@nestjs-cls/transactional'
import { LessonDetailRaw, TextLessonDetailResponse } from '../lesson.response'

@Injectable()
export class TextLessonStrategy implements LessonStrategy {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly baseLessonStrategy: BaseLessonStrategy,
    private readonly quizService: QuizCmsService,
  ) {}

  @Transactional()
  async create(data: CreateLessonBodyType) {
    const order = await this.baseLessonStrategy.getNextOrder(data.chapterId)

    const textContent = data.textContent as string

    const lesson = await this.lessonRepo.createLesson({
      type: LessonType.TEXT,
      title: data.title,
      shortDesc: data?.shortDesc ?? null,
      fullDesc: data?.fullDesc ?? null,
      order: order,
      videoId: null,
      provider: null,
      duration: null,
      chapterId: data.chapterId,
      textContent,
    })

    if (data?.quizData) {
      await this.quizService.createQuiz({ lessonId: lesson.id, quizData: data.quizData })
    }

    return lesson
  }

  get(lesson: LessonDetailRaw): Promise<TextLessonDetailResponse> {
    return Promise.resolve({
      id: lesson.id,
      title: lesson.title,
      shortDesc: lesson.shortDesc,
      type: 'TEXT' as const,
      order: lesson.order,
      chapterId: lesson.chapterId,
      textContent: lesson.textContent ?? '',
    })
  }
}
