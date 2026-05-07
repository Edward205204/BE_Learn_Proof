import { Module } from '@nestjs/common'
import { QuizCmsService } from './quiz-cms.service'
import { QuizRepo } from './quiz.repo'
import { QuizLearnerService } from './quiz-learner.service'
import { QuizController } from './quiz.controller'

import { BullModule } from '@nestjs/bullmq'

@Module({
  imports: [BullModule.registerQueue({ name: 'quiz-generation' })],
  providers: [QuizCmsService, QuizRepo, QuizLearnerService],
  controllers: [QuizController],
  exports: [QuizCmsService, QuizLearnerService],
})
export class QuizModule {}
