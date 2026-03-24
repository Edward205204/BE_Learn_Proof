import { Module } from '@nestjs/common'
import { LessonService } from './lesson.service'
import { LessonController } from './lesson.controller'
import { QuizModule } from '../quiz/quiz.module'

@Module({
  imports: [QuizModule],
  providers: [LessonService],
  controllers: [LessonController],
})
export class LessonModule {}
