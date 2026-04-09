import { BadRequestException, Injectable } from '@nestjs/common'
import { CartRepo } from './cart.repo'

@Injectable()
export class CartService {
  constructor(private readonly cartRepo: CartRepo) {}

  async getCart(userId: string) {
    await this.cartRepo.upsertCart(userId)
    return this.cartRepo.getCartWithItems(userId)
  }

  async addToCart(userId: string, courseId: string) {
    const [course, enrolled] = await Promise.all([
      this.cartRepo.findCoursePublished(courseId),
      this.cartRepo.checkEnrolled(userId, courseId),
    ])

    if (!course) throw new BadRequestException('Khóa học không tồn tại hoặc chưa được publish')
    if (enrolled) throw new BadRequestException('Bạn đã sở hữu khóa học này')

    const cart = await this.cartRepo.upsertCart(userId)
    await this.cartRepo.addItemToCart(cart.id, courseId)
    return this.cartRepo.getCartWithItems(userId)
  }

  async removeFromCart(userId: string, courseId: string) {
    const cart = await this.cartRepo.upsertCart(userId)
    await this.cartRepo.removeItemFromCart(cart.id, courseId)
    return this.cartRepo.getCartWithItems(userId)
  }
}
