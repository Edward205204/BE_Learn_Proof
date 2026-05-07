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
import envConfig from '../../shared/config'
import { AiModule } from '../ai/ai.module'
import { IndexingProcessor } from './processors/indexing.processor'

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: { host: envConfig.REDIS_HOST, port: envConfig.REDIS_PORT },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
    }),
    BullModule.registerQueue({ name: 'lesson-indexing' }),
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
  ],
  controllers: [LessonController],
  exports: [LessonService],
})
export class LessonModule {}
