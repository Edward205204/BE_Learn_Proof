import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export const IdParamSchema = z.object({
  id: z.string().cuid(), 
})