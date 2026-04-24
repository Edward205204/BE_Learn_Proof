import { Controller, Get, Param, Post, Body } from '@nestjs/common'
import { EnrollmentService } from './enrollment.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  EnrollmentIdResponseSchema,
  MyEnrollmentsResponseSchema,
  EnrollmentStatusResponseSchema,
  MarkCompletedResponseSchema,
  CourseProgressResponseSchema,
} from './enrollment.response'

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ZodSerializerDto(EnrollmentIdResponseSchema)
  createEnrollment(@ActiveUser() user: TokenPayload, @Body('courseId') courseId: string) {
    return this.enrollmentService.createEnrollment(courseId, user.userId)
  }

  @Get('me')
  @ZodSerializerDto(MyEnrollmentsResponseSchema)
  getMyEnrollments(@ActiveUser() user: TokenPayload) {
    return this.enrollmentService.getMyEnrollments(user.userId)
  }

  @Get(':courseId/status')
  @ZodSerializerDto(EnrollmentStatusResponseSchema)
  getEnrollmentStatus(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.enrollmentService.getEnrollmentStatus(user.userId, courseId).then((enrolled) => ({ enrolled }))
  }

  @Get(':courseId/progress')
  @ZodSerializerDto(CourseProgressResponseSchema)
  getCourseProgress(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.enrollmentService.getCourseProgress(user.userId, courseId)
  }

  @Post(':courseId/complete')
  @ZodSerializerDto(MarkCompletedResponseSchema)
  markCourseCompleted(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.enrollmentService.markCourseCompleted(user.userId, courseId)
  }
}
