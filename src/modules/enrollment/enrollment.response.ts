import { z } from 'zod'

export const EnrollmentIdResponseSchema = z.object({
  id: z.string(),
})

export const MyEnrollmentItemSchema = z.object({
  id: z.string(),
  enrolledAt: z.date(),
  completedAt: z.date().nullable(),
  lastCaughtUpAt: z.date().nullable(),
  course: z.object({
    id: z.string(),
    title: z.string(),
    thumbnail: z.string().nullable(),
    slug: z.string(),
    isFree: z.boolean(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    creator: z.object({
      fullName: z.string(),
      avatar: z.string().nullable(),
    }),
    category: z.object({
      name: z.string(),
      slug: z.string(),
    }),
  }),
})

export const MyEnrollmentsResponseSchema = z.array(MyEnrollmentItemSchema)

export const EnrollmentStatusResponseSchema = z.object({
  enrolled: z.boolean(),
  progressPercent: z.number().optional(),
})

export const MarkCompletedResponseSchema = EnrollmentIdResponseSchema

export const CourseProgressResponseSchema = z.object({
  totalLessons: z.number(),
  completedLessons: z.number(),
  progressPercent: z.number(),
})
