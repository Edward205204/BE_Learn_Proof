import { Injectable } from '@nestjs/common'
import { WishlistRepo } from './wishlist.repo'

@Injectable()
export class WishlistService {
  constructor(private readonly wishlistRepo: WishlistRepo) {}

  getWishlist(userId: string) {
    return this.wishlistRepo.getWishlistItems(userId)
  }

  async addToWishlist(userId: string, courseId: string) {
    // P2003 (foreign key) tự throw nếu courseId không tồn tại → global filter handle
    await this.wishlistRepo.addItem(userId, courseId)
    return this.wishlistRepo.getWishlistItems(userId)
  }

  async removeFromWishlist(userId: string, courseId: string) {
    await this.wishlistRepo.removeItem(userId, courseId)
    return this.wishlistRepo.getWishlistItems(userId)
  }
}
