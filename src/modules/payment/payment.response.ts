import { z } from 'zod'

export const CreatePaymentResponseSchema = z.object({
  paymentUrl: z.string().url(),
  txnRef: z.string(),
  totalAmount: z.number(),
  courseIds: z.array(z.string()),
})

export const VnpayReturnResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  txnRef: z.string(),
  courseIds: z.array(z.string()),
})
