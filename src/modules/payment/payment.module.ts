import { Module } from '@nestjs/common'
import { PaymentService } from './payment.service'
import { PaymentController } from './payment.controller'
import { VnpayInitService } from './vnpay.init.service'
import { PaymentRepo } from './payment.repo'
import { EnrollmentModule } from '../enrollment/enrollment.module'
import { CartModule } from '../cart/cart.module'

@Module({
  imports: [EnrollmentModule, CartModule],
  providers: [PaymentService, PaymentRepo, VnpayInitService],
  controllers: [PaymentController],
})
export class PaymentModule {}
