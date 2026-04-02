import { Module, forwardRef } from '@nestjs/common'
import { LessonService } from './lesson.service'
import { LessonRepo } from './lesson.repo'
import { LessonController } from './lesson.controller'
import { QuizModule } from '../quiz/quiz.module'
import { CoursesModule } from '../courses/courses.module'

@Module({
  imports: [forwardRef(() => QuizModule), CoursesModule],
  providers: [LessonService, LessonRepo],
  controllers: [LessonController],
  exports: [LessonService],
})
export class LessonModule {}
