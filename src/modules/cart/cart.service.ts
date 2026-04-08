import { Injectable } from '@nestjs/common'
import { CartRepo } from './cart.repo'

@Injectable()
export class CartService {
  constructor(private readonly cartRepo: CartRepo) {}

  async getCart(userId: string) {
    await this.cartRepo.upsertCart(userId)
    return this.cartRepo.getCartWithItems(userId)
  }

  async addToCart(userId: string, courseId: string) {
    const cart = await this.cartRepo.upsertCart(userId)
    // P2003 (foreign key) tự throw nếu courseId không tồn tại → global filter handle
    await this.cartRepo.addItemToCart(cart.id, courseId)
    return this.cartRepo.getCartWithItems(userId)
  }

  async removeFromCart(userId: string, courseId: string) {
    const cart = await this.cartRepo.upsertCart(userId)
    await this.cartRepo.removeItemFromCart(cart.id, courseId)
    return this.cartRepo.getCartWithItems(userId)
  }
}
