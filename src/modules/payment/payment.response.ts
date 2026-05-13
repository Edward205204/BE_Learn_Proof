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

export const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.string(),
  provider: z.string(),
  txnRef: z.string(),
  vnpTxnNo: z.string().nullable(),
  payDate: z.date().nullable(),
  createdAt: z.date(),
  course: z.object({
    title: z.string(),
    thumbnail: z.string().nullable(),
  }),
})

export const PaymentHistoryResponseSchema = z.array(TransactionSchema)
