import { Module } from '@nestjs/common'
import { CourseService } from './courses.service'
import { CourseController } from './course.controller'
import { CourseRepo } from './courses.repo'
import { LearningCoursesService } from './learning-courses.service'
import { CoursesManagerService } from './courses-manager.service';

@Module({
  providers: [CourseService, CourseRepo, LearningCoursesService, CoursesManagerService],
  controllers: [CourseController],
})
export class CoursesModule {}
