import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { CartService } from './cart.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Controller('cart')
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@ActiveUser() user: TokenPayload) {
    return this.cartService.getCart(user.userId)
  }

  @Post('items')
  addToCart(@ActiveUser() user: TokenPayload, @Body('courseId') courseId: string) {
    return this.cartService.addToCart(user.userId, courseId)
  }

  @Delete('items/:courseId')
  removeFromCart(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.cartService.removeFromCart(user.userId, courseId)
  }
}
