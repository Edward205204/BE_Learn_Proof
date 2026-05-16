import { Transactional } from '@nestjs-cls/transactional'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { VnpayInitService } from './vnpay.init.service'
import { PaymentRepo } from './payment.repo'
import { PaymentStatus } from 'src/generated/prisma/client'
import { VnpayReturnQueryType } from './payment.model'
import { EnrollmentService } from '../enrollment/enrollment.service'
import { CartService } from '../cart/cart.service'
import { NotificationsService } from '../notifications/notifications.service'

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
    if (totalAmount <= 0) {
      throw new BadRequestException('Không thể tạo thanh toán cho khóa học miễn phí')
    }

    await this.paymentRepo.createPendingPayments({ userId: body.userId, courses: payableCourses, txnRef })
    const paymentUrl = this.vnpayInitService.createPayment({ amount: totalAmount, txnRef })

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
    this.notificationsService.notify({
      userId,
      type: 'PAYMENT',
      title: 'Thanh toán thành công ✅',
      message: `Bạn đã đăng ký thành công ${courseIds.length} khóa học. Hãy bắt đầu học ngay!`,
      link: '/courses/list',
    }).catch(() => {}) // fire-and-forget, không block response

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
