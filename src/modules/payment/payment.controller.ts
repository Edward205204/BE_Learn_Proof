import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { PaymentService } from './payment.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { CreatePaymentBodyDto, VnpayReturnQueryDto } from './payment.dto'
import { CreatePaymentResponseSchema, PaymentHistoryResponseSchema } from './payment.response'
import { Response } from 'express'
import envConfig from 'src/shared/config'

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth('access-token')
  @Post('vnpay/create-payment')
  @ZodSerializerDto(CreatePaymentResponseSchema)
  createPayment(@Body() body: CreatePaymentBodyDto, @ActiveUser() user: TokenPayload) {
    return this.paymentService.createPayment({ userId: user.userId, courseIds: body.courseIds })
  }

  @ApiBearerAuth('access-token')
  @Post('vnpay/create-payment-from-cart')
  @ZodSerializerDto(CreatePaymentResponseSchema)
  createPaymentFromCart(@ActiveUser() user: TokenPayload) {
    return this.paymentService.createPaymentFromCart(user.userId)
  }

  @IsPublic()
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: VnpayReturnQueryDto, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query)
    const redirectUrl = new URL('/checkout/success', envConfig.FE_URL)
    redirectUrl.searchParams.set('success', String(result.success))
    redirectUrl.searchParams.set('message', result.message)
    redirectUrl.searchParams.set('txnRef', result.txnRef)
    redirectUrl.searchParams.set('courseIds', result.courseIds.join(','))
    return res.redirect(redirectUrl.toString())
  }

  @ApiBearerAuth('access-token')
  @Get('history')
  @ZodSerializerDto(PaymentHistoryResponseSchema)
  getHistory(@ActiveUser() user: TokenPayload) {
    return this.paymentService.getHistory(user.userId)
  }
}
