import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from 'src/generated/prisma/client'
import { EnrollmentRepo } from './enrollment.repo'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class EnrollmentService {
  constructor(private readonly enrollRepo: EnrollmentRepo) {}

  async createEnrollment(courseId: string, userId: string) {
    const course = await this.enrollRepo.findCourseForEnroll(courseId)
    if (!course) throw new NotFoundException('Khóa học không tồn tại hoặc chưa được publish')

    if (!course.isFree) {
      const transaction = await this.enrollRepo.checkUserPaymentCompleted(userId, courseId)
      if (!transaction) {
        throw new BadRequestException(`Bạn chưa thanh toán khóa học này (ID: ${courseId})`)
      }
    }

    try {
      return await this.enrollRepo.upsertEnrollment(courseId, userId)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.enrollRepo.getEnrollmentUnique(userId, courseId)
      }
      throw error
    }
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
    if (!courseId || !userId) return false
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
