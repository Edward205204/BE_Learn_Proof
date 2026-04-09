import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Injectable } from '@nestjs/common'
import { CourseStatus, PaymentStatus, PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class EnrollmentRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  // ─── Write: chỉ enrollment + transaction ───────────────────────────────────

  createEnrollment(courseId: string, userId: string) {
    return this.txHost.tx.enrollment.create({
      data: { userId, courseId },
    })
  }

  updateEnrollmentCompleted(userId: string, courseId: string) {
    return this.txHost.tx.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { completedAt: new Date() },
    })
  }

  // ─── Read: tự do select bất kỳ bảng nào ───────────────────────────────────

  // @TEMP: tạm thời query table transaction để kiểm tra xem user đã thanh toán khoa học này chưa
  checkUserPaymentCompleted(userId: string, courseId: string) {
    return this.txHost.tx.transaction.findFirst({
      where: { userId, courseId, status: PaymentStatus.COMPLETED },
      select: { id: true },
    })
  }

  findCourseForEnroll(courseId: string) {
    return this.txHost.tx.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
      select: { id: true, isFree: true },
    })
  }

  getEnrollmentUnique(userId: string, courseId: string) {
    return this.txHost.tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
  }

  getMyEnrollmentsByUserId(userId: string) {
    return this.txHost.tx.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        enrolledAt: true,
        completedAt: true,
        lastCaughtUpAt: true,
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            slug: true,
            isFree: true,
            level: true,
            creator: { select: { fullName: true, avatar: true } },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })
  }

  async getProgressSummary(userId: string, courseId: string) {
    const [total, completed] = await Promise.all([
      this.txHost.tx.lesson.count({ where: { chapter: { courseId } } }),
      this.txHost.tx.progress.count({
        where: { userId, isCompleted: true, lesson: { chapter: { courseId } } },
      }),
    ])
    return {
      totalLessons: total,
      completedLessons: completed,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }
}
