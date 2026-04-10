import { Module } from '@nestjs/common'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { CartRepo } from './cart.repo'

@Module({
  controllers: [CartController],
  providers: [CartService, CartRepo],
  exports: [CartService],
})
export class CartModule {}
