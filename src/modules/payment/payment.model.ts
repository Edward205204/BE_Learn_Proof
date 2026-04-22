import { z } from 'zod'

export const CreatePaymentBodySchema = z
  .object({
    courseIds: z.array(z.string().min(1)).min(1),
  })
  .strict()

export const CreatePaymentFromCartBodySchema = z.object({}).strict()

export const VnpayReturnQuerySchema = z
  .object({
    vnp_ResponseCode: z.string().optional(),
    vnp_TxnRef: z.string(),
    vnp_TransactionNo: z.string().optional(),
    vnp_PayDate: z.string().optional(),
    vnp_SecureHash: z.string(),
  })
  .passthrough()

export type CreatePaymentBodyType = z.infer<typeof CreatePaymentBodySchema>
export type CreatePaymentFromCartBodyType = z.infer<typeof CreatePaymentFromCartBodySchema>
export type VnpayReturnQueryType = z.infer<typeof VnpayReturnQuerySchema>
