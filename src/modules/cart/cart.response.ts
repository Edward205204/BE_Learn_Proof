import { z } from 'zod'

export const CartItemCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().nullable(),
  price: z.number(),
  originalPrice: z.number().nullable(),
  isFree: z.boolean(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  creator: z.object({
    fullName: z.string(),
    avatar: z.string().nullable(),
  }),
})

export const CartItemSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  course: CartItemCourseSchema,
})

export const CartResponseSchema = z
  .object({
    id: z.string(),
    items: z.array(CartItemSchema),
  })
  .nullable()

export const CheckoutResponseSchema = z.object({
  courseIds: z.array(z.string()),
})
