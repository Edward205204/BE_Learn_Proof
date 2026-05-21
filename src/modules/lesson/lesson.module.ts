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

import { BullModule } from '@nestjs/bullmq'
import { AiModule } from '../ai/ai.module'
import { IndexingProcessor } from './processors/indexing.processor'
import { LessonAiProcessor } from './processors/lesson-ai.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'lesson-indexing' }),
    BullModule.registerQueue({ name: 'lesson-ai' }),
    QuizModule,
    AiModule,
  ],
  providers: [
    LessonService,
    LessonRepo,
    BaseLessonStrategy,
    LessonStrategyRegistry,
    QuizLessonStrategy,
    TextLessonStrategy,
    VideoLessonStrategy,
    IndexingProcessor,
    LessonAiProcessor,
  ],
  controllers: [LessonController],
  exports: [LessonService],
})
export class LessonModule {}
