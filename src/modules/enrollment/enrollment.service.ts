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
      throw new BadRequestException('Khóa học trả phí cần được kích hoạt thông qua luồng thanh toán')
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
    if (!enrollments.length) return []

    const courseIds = [...new Set(enrollments.map((item) => item.course.id))]
    const [analyticsMap, progressMap] = await Promise.all([
      this.enrollRepo.getCourseAnalyticsByCourseIds(courseIds),
      this.enrollRepo.getProgressSummariesByCourseIds(userId, courseIds),
    ])

    return enrollments.map((enrollment) => {
      const courseId = enrollment.course.id
      const analytics = analyticsMap.get(courseId) || { avgRating: 0, totalStudents: 0 }
      const progress = progressMap.get(courseId) || { totalLessons: 0, completedLessons: 0, progressPercent: 0 }
      return {
        ...enrollment,
        course: {
          ...enrollment.course,
          overallAnalytics: analytics,
        },
        ...progress,
      }
    })
  }

  async getCourseProgress(userId: string, courseId: string) {
    const progressMap = await this.enrollRepo.getProgressSummariesByCourseIds(userId, [courseId])
    return (
      progressMap.get(courseId) || {
        totalLessons: 0,
        completedLessons: 0,
        progressPercent: 0,
      }
    )
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

  async getOwnedCourseIds(userId: string, courseIds: string[]) {
    if (!courseIds.length) return []
    const rows = await this.enrollRepo.getOwnedCourseIds(userId, courseIds)
    return rows.map((row) => row.courseId)
  }

  @Transactional()
  async grantEnrollmentsAfterPayment(userId: string, courseIds: string[]) {
    if (!courseIds.length) return []
    return this.enrollRepo.upsertManyEnrollments(userId, courseIds)
  }
}
