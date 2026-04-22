import { BadRequestException, Injectable } from '@nestjs/common'
import { Transactional } from '@nestjs-cls/transactional'
import { CartRepo } from './cart.repo'
import { CourseService } from '../courses/services/courses.service'
import { EnrollmentService } from '../enrollment/enrollment.service'

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepo: CartRepo,
    private readonly courseService: CourseService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async getCart(userId: string) {
    await this.cartRepo.upsertCart(userId)
    return this.cartRepo.getCartWithItems(userId)
  }

  async addToCart(userId: string, courseId: string) {
    if (!courseId) throw new BadRequestException('ID khóa học không hợp lệ')
    const [course, enrolled] = await Promise.all([
      this.courseService.findCoursePublic(courseId),
      this.enrollmentService.getEnrollmentStatus(userId, courseId),
    ])

    if (!course) throw new BadRequestException('Khóa học không tồn tại hoặc chưa được mở bán')
    if (enrolled) throw new BadRequestException('Bạn đã sở hữu khóa học này, hãy bắt đầu học ngay!')

    const cart = await this.cartRepo.upsertCart(userId)
    await this.cartRepo.addItemToCart(cart.id, courseId)
    return this.cartRepo.getCartWithItems(userId)
  }

  async removeFromCart(userId: string, courseId: string) {
    const cart = await this.cartRepo.upsertCart(userId)
    await this.cartRepo.removeItemFromCart(cart.id, courseId)
    return this.cartRepo.getCartWithItems(userId)
  }

  @Transactional()
  async checkout(userId: string) {
    return this.cartRepo.getCartCourseIdsForCheckout(userId)
  }

  @Transactional()
  async removePurchasedItems(userId: string, courseIds: string[]) {
    await this.cartRepo.removeItemsByCourseIds(userId, courseIds)
  }
}
