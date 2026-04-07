import { Module } from '@nestjs/common'
import { LessonService } from './lesson.service'
import { LessonController } from './lesson.controller'
import { QuizModule } from '../quiz/quiz.module'
import { LessonRepo } from './lesson.repo'
import { BaseLessonStrategy } from './strategies/base-lesson.strategy'
import { LessonStrategyRegistry } from './strategies/lesson-strategy.registry'
import { QuizLessonStrategy } from './strategies/quiz-lesson.strategy'
import { TextLessonStrategy } from './strategies/text-lesson.strategy'
import { VideoLessonStrategy } from './strategies/video-lesson.strategy'

@Module({
  imports: [QuizModule],
  providers: [
    LessonService,
    LessonRepo,
    BaseLessonStrategy,
    LessonStrategyRegistry,
    QuizLessonStrategy,
    TextLessonStrategy,
    VideoLessonStrategy,
  ],
  controllers: [LessonController],
  exports: [LessonService],
})
export class LessonModule {}
