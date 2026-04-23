import { z } from 'zod'

export const DashboardFilterSchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
})

export const DashboardOverviewSchema = z.object({
  totalUsers: z.number(),
  totalCourses: z.number(),
  totalPublishedCourses: z.number(),
  totalEnrollments: z.number(),
  totalTransactions: z.number(),
  totalRevenue: z.number(),
})

export const CartAbandonedItemSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  cartCount: z.number(),
  purchasedCount: z.number(),
  abandonedCount: z.number(),
})

export const FallingRatedCourseSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  avgRating: z.number(),
  totalReviews: z.number(),
})

export const RevenueChartItemSchema = z.object({
  month: z.date(),
  revenue: z.number(),
})

export const RevenueChartResponseSchema = z.array(RevenueChartItemSchema)
export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>
export type RevenueChartItem = z.infer<typeof RevenueChartItemSchema>
