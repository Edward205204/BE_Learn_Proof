import { Module } from '@nestjs/common'
import { QuizCmsService } from './quiz-cms.service'
import { QuizRepo } from './quiz.repo'
import { QuizLearnerService } from './quiz-learner.service'
import { QuizController } from './quiz.controller'

@Module({
  providers: [QuizCmsService, QuizRepo, QuizLearnerService],
  controllers: [QuizController],
  exports: [QuizCmsService, QuizLearnerService],
})
export class QuizModule {}
