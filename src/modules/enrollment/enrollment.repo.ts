import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Injectable } from '@nestjs/common'
import { PaymentStatus, PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class EnrollmentRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  // @TEMP: tạm thời query table transaction để kiểm tra xem user đã thanh toán khoa học này chưa
  checkUserPaymentCompleted(userId: string, courseId: string) {
    return this.txHost.tx.transaction.findFirst({
      where: { userId, courseId, status: PaymentStatus.COMPLETED },
      select: { id: true },
    })
  }

  createEnrollment(courseId: string, userId: string) {
    return this.txHost.tx.enrollment.create({
      data: {
        userId,
        courseId,
      },
    })
  }

  getMyEnrollmentsByUserId(userId: string) {
    return this.txHost.tx.enrollment.findMany({
      where: {
        userId,
      },
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
            creator: {
              select: {
                fullName: true,
                avatar: true,
              },
            },
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
            chapters: {
              select: {
                _count: { select: { lessons: true } },
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    })
  }
}
