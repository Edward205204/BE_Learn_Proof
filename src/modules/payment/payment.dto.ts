import { createZodDto } from 'nestjs-zod'
import { CreatePaymentBodySchema, VnpayReturnQuerySchema } from './payment.model'

export class CreatePaymentBodyDto extends createZodDto(CreatePaymentBodySchema) {}
export class VnpayReturnQueryDto extends createZodDto(VnpayReturnQuerySchema) {}
