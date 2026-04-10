import { z } from 'zod'

export const WishlistItemCourseSchema = z.object({
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

export const WishlistItemSchema = z.object({
  course: WishlistItemCourseSchema,
})

export const WishlistResponseSchema = z.array(WishlistItemSchema)
