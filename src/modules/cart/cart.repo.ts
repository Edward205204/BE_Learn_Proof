import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PaymentStatus, PrismaClient } from 'src/generated/prisma/client'

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
            id: true,
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
        },
      },
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

  async checkout(userId: string) {
    const cart = await this.getCartWithItems(userId)
    if (!cart || cart.items.length === 0) return null

    const transactionData = cart.items.map((item) => ({
      userId,
      courseId: item.course.id,
      amount: item.course.price,
      status: PaymentStatus.COMPLETED,
      provider: 'MOCK_PAYMENT'
    }))

    // 1. Create transactions
    await this.txHost.tx.transaction.createMany({
      data: transactionData
    })

    // 2. Clear cart
    await this.txHost.tx.cartItem.deleteMany({
      where: { cartId: cart.id }
    })

    return cart.items.map((item) => item.course.id)
  }
}
