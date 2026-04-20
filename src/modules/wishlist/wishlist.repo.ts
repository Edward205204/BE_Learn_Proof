import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class WishlistRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  async getWishlistItems(userId: string) {
    const items = await this.txHost.tx.wishlistItem.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            price: true,
            originalPrice: true,
            isFree: true,
            level: true,
            creator: { select: { fullName: true, avatar: true } },
          },
        },
      },
    })

    // --- Gắn thêm analytics cho từng khóa học ---
    return await Promise.all(
      items.map(async (i) => {
        const [avgRatingRes, totalStudents] = await Promise.all([
          this.txHost.tx.review.aggregate({
            where: { courseId: i.course.id },
            _avg: { rating: true },
          }),
          this.txHost.tx.enrollment.count({
            where: { courseId: i.course.id },
          }),
        ])

        return {
          ...i,
          course: {
            ...i.course,
            overallAnalytics: {
              avgRating: avgRatingRes._avg.rating || 0,
              totalStudents,
            },
          },
        }
      }),
    )
  }

  addItem(userId: string, courseId: string) {
    return this.txHost.tx.wishlistItem.createMany({
      data: [{ userId, courseId }],
      skipDuplicates: true,
    })
  }

  removeItem(userId: string, courseId: string) {
    return this.txHost.tx.wishlistItem.deleteMany({
      where: { userId, courseId },
    })
  }
}
