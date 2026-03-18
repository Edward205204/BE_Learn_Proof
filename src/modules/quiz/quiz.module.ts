import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepo } from './quiz.repo';

@Module({
  controllers: [QuizController],
  providers: [QuizService, QuizRepo],
})
export class QuizModule {}
