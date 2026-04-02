import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { WishlistService } from './wishlist.service'
import { ActiveUser } from '../../shared/decorators/active-user.decorator'
import { TokenPayload } from '../../shared/types/jwt.type'

@Controller('wishlist')
@ApiBearerAuth('access-token')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@ActiveUser() user: TokenPayload) {
    return this.wishlistService.getWishlist(user.userId)
  }

  @Post(':courseId')
  addToWishlist(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.wishlistService.addToWishlist(user.userId, courseId)
  }

  @Delete(':courseId')
  removeFromWishlist(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.wishlistService.removeFromWishlist(user.userId, courseId)
  }
}
