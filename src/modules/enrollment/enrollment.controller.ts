import { Controller, Get, Param, Post, Body } from '@nestjs/common'
import { EnrollmentService } from './enrollment.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  createEnrollment(@ActiveUser() user: TokenPayload, @Body('courseId') courseId: string) {
    return this.enrollmentService.createEnrollment(courseId, user.userId)
  }

  @Get('me')
  getMyEnrollments(@ActiveUser() user: TokenPayload) {
    return this.enrollmentService.getMyEnrollments(user.userId)
  }

  @Get(':courseId/status')
  getEnrollmentStatus(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.enrollmentService.getEnrollmentStatus(user.userId, courseId)
  }

  @Post(':courseId/complete')
  markCourseCompleted(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.enrollmentService.markCourseCompleted(user.userId, courseId)
  }
}
