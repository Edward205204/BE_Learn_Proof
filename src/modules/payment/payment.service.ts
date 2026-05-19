import { Transactional } from '@nestjs-cls/transactional'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { VnpayInitService } from './vnpay.init.service'
import { PaymentRepo } from './payment.repo'
import { PaymentStatus } from 'src/generated/prisma/client'
import { VnpayReturnQueryType } from './payment.model'
import { EnrollmentService } from '../enrollment/enrollment.service'
import { CartService } from '../cart/cart.service'
import { NotificationsService } from '../notifications/notifications.service'
import envConfig from 'src/shared/config'

@Injectable()
export class PaymentService {
  constructor(
    private readonly vnpayInitService: VnpayInitService,
    private readonly paymentRepo: PaymentRepo,
    private readonly enrollmentService: EnrollmentService,
    private readonly cartService: CartService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Transactional()
  async createPayment(body: { userId: string; courseIds: string[] }) {
    const uniqueCourseIds = [...new Set(body.courseIds)]
    if (!uniqueCourseIds.length) throw new BadRequestException('Danh sách khóa học không hợp lệ')

    const txnRef = `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const [courses, enrolledCourseIds] = await Promise.all([
      this.paymentRepo.getCoursePrices(uniqueCourseIds),
      this.enrollmentService.getOwnedCourseIds(body.userId, uniqueCourseIds),
    ])

    if (!courses.length) {
      throw new NotFoundException('Không tìm thấy khóa học hợp lệ để thanh toán')
    }

    const existingCourseIds = new Set(courses.map((course) => course.id))
    const invalidCourseIds = uniqueCourseIds.filter((courseId) => !existingCourseIds.has(courseId))
    if (invalidCourseIds.length) {
      throw new BadRequestException(`Khóa học không tồn tại hoặc chưa mở bán: ${invalidCourseIds.join(', ')}`)
    }

    const enrolledCourseIdSet = new Set(enrolledCourseIds)
    const payableCourses = courses.filter((course) => !enrolledCourseIdSet.has(course.id))
    if (!payableCourses.length) {
      throw new BadRequestException('Bạn đã sở hữu tất cả khóa học trong danh sách')
    }

    const totalAmount = payableCourses.reduce((acc, course) => acc + course.price, 0)

    await this.paymentRepo.createPendingPayments({ userId: body.userId, courses: payableCourses, txnRef })

    let paymentUrl: string
    const courseIdsToEnroll = payableCourses.map((course) => course.id)

    if (totalAmount <= 0) {
      await this.paymentRepo.completeTransactionsByTxnRef({
        txnRef,
        responseCode: '00',
        vnpTxnNo: 'FREE_COURSE',
        payDate: new Date(),
      })
      await this.enrollmentService.grantEnrollmentsAfterPayment(body.userId, courseIdsToEnroll)
      await this.cartService.removePurchasedItems(body.userId, courseIdsToEnroll)

      this.notificationsService
        .notify({
          userId: body.userId,
          type: 'PAYMENT',
          title: 'Thanh toán thành công ✅',
          message: `Bạn đã đăng ký thành công ${courseIdsToEnroll.length} khóa học. Hãy bắt đầu học ngay!`,
          link: '/courses/list',
        })
        .catch(() => {})

      const redirectUrl = new URL('/checkout/success', envConfig.FE_URL)
      redirectUrl.searchParams.set('success', 'true')
      redirectUrl.searchParams.set('message', 'Thanh toán thành công, đã kích hoạt khóa học')
      redirectUrl.searchParams.set('txnRef', txnRef)
      redirectUrl.searchParams.set('courseIds', courseIdsToEnroll.join(','))

      paymentUrl = redirectUrl.toString()
    } else {
      paymentUrl = this.vnpayInitService.createPayment({ amount: totalAmount, txnRef })
    }

    return {
      paymentUrl,
      txnRef,
      totalAmount,
      courseIds: payableCourses.map((course) => course.id),
    }
  }

  @Transactional()
  async createPaymentFromCart(userId: string) {
    const courseIds = await this.cartService.checkout(userId)
    if (!courseIds?.length) {
      throw new BadRequestException('Giỏ hàng đang trống')
    }
    return this.createPayment({ userId, courseIds })
  }

  @Transactional()
  async handleVnpayReturn(query: VnpayReturnQueryType) {
    const txnRef = query.vnp_TxnRef
    const transactions = await this.paymentRepo.getTransactionsByTxnRef(txnRef)
    if (!transactions.length) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán')
    }

    const courseIds = [...new Set(transactions.map((item) => item.courseId))]
    if (transactions.every((item) => item.status === PaymentStatus.COMPLETED)) {
      return {
        success: true,
        message: 'Giao dịch đã được xác nhận trước đó',
        txnRef,
        courseIds,
      }
    }

    const verifyResult = this.vnpayInitService.verifyReturnQuery(query)
    const isSuccess = verifyResult.isVerified && verifyResult.isSuccess && query.vnp_ResponseCode === '00'
    if (!isSuccess) {
      await this.paymentRepo.failTransactionsByTxnRef({
        txnRef,
        responseCode: query.vnp_ResponseCode,
      })
      return {
        success: false,
        message: verifyResult.isVerified ? 'Thanh toán thất bại' : verifyResult.message,
        txnRef,
        courseIds,
      }
    }

    await this.paymentRepo.completeTransactionsByTxnRef({
      txnRef,
      responseCode: query.vnp_ResponseCode,
      vnpTxnNo: query.vnp_TransactionNo,
      payDate: this.parseVnpPayDate(query.vnp_PayDate),
    })

    const userId = transactions[0].userId
    await this.enrollmentService.grantEnrollmentsAfterPayment(userId, courseIds)
    await this.cartService.removePurchasedItems(userId, courseIds)

    // Gửi thông báo thanh toán thành công
    this.notificationsService
      .notify({
        userId,
        type: 'PAYMENT',
        title: 'Thanh toán thành công ✅',
        message: `Bạn đã đăng ký thành công ${courseIds.length} khóa học. Hãy bắt đầu học ngay!`,
        link: '/courses/list',
      })
      .catch(() => {}) // fire-and-forget, không block response

    return {
      success: true,
      message: 'Thanh toán thành công, đã kích hoạt khóa học',
      txnRef,
      courseIds,
    }
  }

  async getHistory(userId: string) {
    return this.paymentRepo.getTransactionsByUserId(userId)
  }

  private parseVnpPayDate(vnpPayDate?: string) {
    if (!vnpPayDate || vnpPayDate.length !== 14) return undefined
    const year = Number(vnpPayDate.slice(0, 4))
    const month = Number(vnpPayDate.slice(4, 6))
    const day = Number(vnpPayDate.slice(6, 8))
    const hour = Number(vnpPayDate.slice(8, 10))
    const minute = Number(vnpPayDate.slice(10, 12))
    const second = Number(vnpPayDate.slice(12, 14))
    if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) return undefined
    return new Date(year, month - 1, day, hour, minute, second)
  }
}
