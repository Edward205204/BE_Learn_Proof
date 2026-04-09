import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class CartRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  upsertCart(userId: string) {
    return this.txHost.tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    })
  }

  getCartWithItems(userId: string) {
    return this.txHost.tx.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
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
        },
      },
    })
  }

  findCoursePublished(courseId: string) {
    return this.txHost.tx.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
      select: { id: true },
    })
  }

  checkEnrolled(userId: string, courseId: string) {
    return this.txHost.tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    })
  }

  addItemToCart(cartId: string, courseId: string) {
    return this.txHost.tx.cartItem.createMany({
      data: [{ cartId, courseId }],
      skipDuplicates: true,
    })
  }

  removeItemFromCart(cartId: string, courseId: string) {
    return this.txHost.tx.cartItem.deleteMany({
      where: { cartId, courseId },
    })
  }
}
