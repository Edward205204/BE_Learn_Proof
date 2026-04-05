import { Module } from '@nestjs/common'
import { QuizCmsService } from './quiz-cms.service'
import { QuizRepo } from './quiz.repo'
import { QuizLearnerService } from './quiz-learner.service'

@Module({
  providers: [QuizCmsService, QuizRepo, QuizLearnerService],
  exports: [QuizCmsService, QuizLearnerService],
})
export class QuizModule {}
