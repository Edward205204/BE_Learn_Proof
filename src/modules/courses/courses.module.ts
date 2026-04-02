import { Module } from '@nestjs/common'
import { CourseService } from './services/courses.service'
import { CourseController } from './course.controller'
import { CourseRepo } from './courses.repo'
import { LearningCoursesService } from './services/learning-courses.service'
import { CoursesManagerService } from './services/courses-manager.service'

@Module({
  providers: [CourseService, CourseRepo, LearningCoursesService, CoursesManagerService],
  controllers: [CourseController],
})
export class CoursesModule {}
