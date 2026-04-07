import { Injectable } from '@nestjs/common'
import { LessonType } from 'src/generated/prisma/enums'
import { LessonStrategy } from './lesson.strategy.interface'
import { VideoLessonStrategy } from './video-lesson.strategy'
import { TextLessonStrategy } from './text-lesson.strategy'
import { QuizLessonStrategy } from './quiz-lesson.strategy'

@Injectable()
export class LessonStrategyRegistry {
  private map: Map<LessonType, LessonStrategy>

  constructor(
    private videoStrategy: VideoLessonStrategy,
    private textStrategy: TextLessonStrategy,
    private quizStrategy: QuizLessonStrategy,
  ) {
    this.map = new Map<LessonType, LessonStrategy>([
      [LessonType.VIDEO, videoStrategy],
      [LessonType.TEXT, textStrategy],
      [LessonType.QUIZ, quizStrategy],
    ])
  }

  resolve(type: LessonType): LessonStrategy {
    const strategy = this.map.get(type)
    if (!strategy) throw new Error(`No strategy for type: ${type}`)
    return strategy
  }
}
