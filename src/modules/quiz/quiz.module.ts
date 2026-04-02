import { Module, forwardRef } from '@nestjs/common'
import { QuizController } from './quiz.controller'
import { QuizService } from './quiz.service'
import { QuizRepo } from './quiz.repo'
import { CoursesModule } from '../courses/courses.module'
import { LessonModule } from '../lesson/lesson.module'

@Module({
  imports: [CoursesModule, forwardRef(() => LessonModule)],
  controllers: [QuizController],
  providers: [QuizService, QuizRepo],
  exports: [QuizService],
})
export class QuizModule {}
