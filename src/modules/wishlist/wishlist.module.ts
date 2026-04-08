import { Module } from '@nestjs/common'
import { WishlistController } from './wishlist.controller'
import { WishlistService } from './wishlist.service'
import { WishlistRepo } from './wishlist.repo'

@Module({
  controllers: [WishlistController],
  providers: [WishlistService, WishlistRepo],
  exports: [WishlistService],
})
export class WishlistModule {}
