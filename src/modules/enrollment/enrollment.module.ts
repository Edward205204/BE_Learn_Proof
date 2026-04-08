import { Module } from '@nestjs/common'
import { EnrollmentService } from './enrollment.service'
import { EnrollmentController } from './enrollment.controller'
import { EnrollmentRepo } from './enrollment.repo'
import { CoursesModule } from '../courses/courses.module'

@Module({
  imports: [CoursesModule],
  providers: [EnrollmentService, EnrollmentRepo],
  controllers: [EnrollmentController],
})
export class EnrollmentModule {}
