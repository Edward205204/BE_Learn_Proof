import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PaymentStatus, CourseStatus } from '@prisma/client'

@Injectable()
export class DashboardRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  getOverview() {
    return Promise.all([
      this.txHost.tx.user.count({
        where: { deletedAt: null },
      }),

      this.txHost.tx.course.count(),

      this.txHost.tx.course.count({
        where: { status: CourseStatus.PUBLISHED },
      }),

      this.txHost.tx.enrollment.count(),

      this.txHost.tx.transaction.count(),

      this.txHost.tx.transaction.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.COMPLETED },
      }),
    ])
  }

  getRevenueChart(fromDate?: string, toDate?: string) {
    return this.txHost.tx.$queryRaw<any[]>`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      SUM(amount) as revenue
    FROM "Transaction"
    WHERE status = 'COMPLETED'
    GROUP BY month
    ORDER BY month ASC
  `
  }

  async getTopCoursesByMonth(month: string) {
    return this.txHost.tx.$queryRaw`
      SELECT 
        c.id,
        c.title,
        SUM(t.amount) as revenue,
        COUNT(t.id) as total_sales
      FROM "Transaction" t
      JOIN "Course" c ON c.id = t."courseId"
      WHERE t.status = 'COMPLETED'
        AND DATE_TRUNC('month', t."createdAt") = DATE_TRUNC('month', ${month}::timestamp)
      GROUP BY c.id, c.title
      ORDER BY revenue DESC
      LIMIT 5
    `
  }

  async getHardLessons() {
    return this.txHost.tx.$queryRaw`
      SELECT 
        l.id,
        l.title,
        COUNT(p.id) FILTER (WHERE p."isCompleted" = false) as not_completed,
        COUNT(p.id) FILTER (WHERE p."isCompleted" = true) as completed,
        COUNT(h.id) as total_views
      FROM "Lesson" l
      LEFT JOIN "Progress" p ON p."lessonId" = l.id
      LEFT JOIN "LessonHeartbeat" h ON h."lessonId" = l.id
      GROUP BY l.id, l.title
      HAVING COUNT(p.id) > 10
      ORDER BY not_completed DESC
      LIMIT 10
    `
  }

  async getCartAbandonedCourses() {
    return this.txHost.tx.$queryRaw`
      SELECT 
        c.id,
        c.title,
        COUNT(ci.id) as cart_count,
        COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as purchased_count
      FROM "Course" c
      LEFT JOIN "CartItem" ci ON ci."courseId" = c.id
      LEFT JOIN "Transaction" t ON t."courseId" = c.id
      GROUP BY c.id, c.title
      HAVING COUNT(ci.id) > COUNT(t.id)
      ORDER BY cart_count DESC
      LIMIT 10
    `
  }

  async getFallingRatedCourses() {
    return this.txHost.tx.$queryRaw`
      SELECT 
        c.id,
        c.title,
        AVG(r.rating) as avg_rating,
        COUNT(r.id) as total_reviews
      FROM "Course" c
      LEFT JOIN "Review" r ON r."courseId" = c.id
      GROUP BY c.id, c.title
      HAVING COUNT(r.id) > 5
      ORDER BY avg_rating ASC
      LIMIT 10
    `
  }
}
