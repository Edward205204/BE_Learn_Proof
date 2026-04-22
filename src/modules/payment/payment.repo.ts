import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from 'src/generated/prisma/client'
import { CourseStatus, PaymentProvider, PaymentStatus } from 'src/generated/prisma/client'

@Injectable()
export class PaymentRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  getCoursePrices(courseIds: string[]) {
    return this.txHost.tx.course.findMany({
      where: {
        id: {
          in: courseIds,
        },
        status: CourseStatus.PUBLISHED,
      },
      select: {
        id: true,
        price: true,
      },
    })
  }

  createPendingPayments(body: { userId: string; courses: Array<{ id: string; price: number }>; txnRef: string }) {
    return this.txHost.tx.transaction.createMany({
      data: body.courses.map((course) => ({
        userId: body.userId,
        courseId: course.id,
        amount: course.price,
        txnRef: body.txnRef,
        provider: PaymentProvider.VNPAY,
        status: PaymentStatus.PENDING,
      })),
    })
  }

  getTransactionsByTxnRef(txnRef: string) {
    return this.txHost.tx.transaction.findMany({
      where: { txnRef },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
      },
    })
  }

  completeTransactionsByTxnRef(body: { txnRef: string; vnpTxnNo?: string; responseCode?: string; payDate?: Date }) {
    return this.txHost.tx.transaction.updateMany({
      where: { txnRef: body.txnRef, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.COMPLETED,
        vnpTxnNo: body.vnpTxnNo,
        responseCode: body.responseCode,
        payDate: body.payDate,
      },
    })
  }

  failTransactionsByTxnRef(body: { txnRef: string; responseCode?: string }) {
    return this.txHost.tx.transaction.updateMany({
      where: { txnRef: body.txnRef, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.FAILED,
        responseCode: body.responseCode,
      },
    })
  }
}
