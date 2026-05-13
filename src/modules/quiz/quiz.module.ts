import { Module } from '@nestjs/common'
import { QuizCmsService } from './quiz-cms.service'
import { QuizRepo } from './quiz.repo'
import { QuizLearnerService } from './quiz-learner.service'
import { QuizController } from './quiz.controller'

import { BullModule } from '@nestjs/bullmq'
import { AiModule } from '../ai/ai.module'
import { QuizGenProcessor } from './processors/quiz-gen.processor'

@Module({
  imports: [BullModule.registerQueue({ name: 'quiz-generation' }), AiModule],
  providers: [QuizCmsService, QuizRepo, QuizLearnerService, QuizGenProcessor],
  controllers: [QuizController],
  exports: [QuizCmsService, QuizLearnerService],
})
export class QuizModule {}
