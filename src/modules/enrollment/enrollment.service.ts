import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EnrollmentRepo } from './enrollment.repo'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class EnrollmentService {
  constructor(private readonly enrollRepo: EnrollmentRepo) {}

  @Transactional()
  async createEnrollment(courseId: string, userId: string) {
    const course = await this.enrollRepo.findCourseForEnroll(courseId)
    if (!course) throw new NotFoundException('Khóa học không tồn tại hoặc chưa được publish')

    if (!course.isFree) {
      const transaction = await this.enrollRepo.checkUserPaymentCompleted(userId, courseId)
      if (!transaction) throw new BadRequestException('Bạn chưa thanh toán khóa học này')
    }

    return this.enrollRepo.createEnrollment(courseId, userId)
  }

  async getMyEnrollments(userId: string) {
    const enrollments = await this.enrollRepo.getMyEnrollmentsByUserId(userId)
    const progressList = await Promise.all(
      enrollments.map((e) => this.enrollRepo.getProgressSummary(userId, e.course.id)),
    )

    return enrollments.map((enrollment, idx) => ({
      ...enrollment,
      ...progressList[idx],
    }))
  }

  async getEnrollmentStatus(userId: string, courseId: string) {
    const enrollment = await this.enrollRepo.getEnrollmentUnique(userId, courseId)
    return !!enrollment
  }

  async markCourseCompleted(userId: string, courseId: string) {
    const enrollment = await this.enrollRepo.getEnrollmentUnique(userId, courseId)
    if (!enrollment) throw new ForbiddenException('Bạn chưa đăng ký khóa học này')
    if (enrollment.completedAt) return enrollment
    await this.enrollRepo.updateEnrollmentCompleted(userId, courseId)
  }
}
