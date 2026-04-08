import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { EnrollmentRepo } from './enrollment.repo'
import { CourseService } from '../courses/services/courses.service'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly enrollRepo: EnrollmentRepo,
    private readonly courseService: CourseService,
  ) {}

  @Transactional()
  async createEnrollment(courseId: string, userId: string) {
    const course = await this.courseService.findCoursePublic(courseId)
    if (!course) throw new NotFoundException('Khoa hoc khong ton tai')

    if (course.isFree === false) {
      const transaction = await this.enrollRepo.checkUserPaymentCompleted(userId, courseId)
      if (!transaction) throw new BadRequestException('Bạn chưa thanh toán khóa học này')
    }

    return this.enrollRepo.createEnrollment(courseId, userId)
  }

  getMyEnrollments(userId: string) {
    return this.enrollRepo.getMyEnrollmentsByUserId(userId)
  }
}
