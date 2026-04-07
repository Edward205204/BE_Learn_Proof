import { Injectable } from '@nestjs/common'
import { CreateLessonDto } from '../lesson.dto'
import { LessonStrategy } from './lesson.strategy.interface'
import { LessonType } from '../lesson.model'
import { LessonRepo } from '../lesson.repo'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class TextLessonStrategy implements LessonStrategy {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly baseLessonStrategy: BaseLessonStrategy,
    private readonly quizService: QuizCmsService,
  ) {}

  @Transactional()
  async create(data: CreateLessonDto) {
    const order = await this.baseLessonStrategy.getNextOrder(data.chapterId)

    // zod đã check kiểu trước đó
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
}
