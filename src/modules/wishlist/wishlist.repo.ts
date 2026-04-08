import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class WishlistRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  getWishlistItems(userId: string) {
    return this.txHost.tx.wishlistItem.findMany({
      where: { userId },
      select: {
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
