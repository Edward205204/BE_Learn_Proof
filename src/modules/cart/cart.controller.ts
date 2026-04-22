import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { CartService } from './cart.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { ZodSerializerDto } from 'nestjs-zod'
import { CartResponseSchema, CheckoutResponseSchema } from './cart.response'

@Controller('cart')
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ZodSerializerDto(CartResponseSchema)
  getCart(@ActiveUser() user: TokenPayload) {
    return this.cartService.getCart(user.userId)
  }

  @Post('items')
  @ZodSerializerDto(CartResponseSchema)
  addToCart(@ActiveUser() user: TokenPayload, @Body('courseId') courseId: string) {
    return this.cartService.addToCart(user.userId, courseId)
  }

  @Delete('items/:courseId')
  @ZodSerializerDto(CartResponseSchema)
  removeFromCart(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.cartService.removeFromCart(user.userId, courseId)
  }

  @Post('checkout')
  @ZodSerializerDto(CheckoutResponseSchema)
  async checkout(@ActiveUser() user: TokenPayload) {
    const courseIds = await this.cartService.checkout(user.userId)
    return { courseIds: courseIds || [] }
  }
}
