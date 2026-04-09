import { Module } from '@nestjs/common'
import { EnrollmentService } from './enrollment.service'
import { EnrollmentController } from './enrollment.controller'
import { EnrollmentRepo } from './enrollment.repo'

@Module({
  providers: [EnrollmentService, EnrollmentRepo],
  controllers: [EnrollmentController],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
