import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { PaymentStatus, CourseStatus } from 'src/generated/prisma/enums'

@Injectable()
export class DashboardRepo {
  constructor(private prisma: PrismaService) {}

  getOverview(): Promise<[number, number, number, number, number, { _sum: { amount: number | null } }]> {
    return Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.course.count(),
      this.prisma.course.count({
        where: { status: CourseStatus.PUBLISHED },
      }),
      this.prisma.enrollment.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.COMPLETED },
      }),
    ])
  }

  getRevenueChart(fromDate?: string, toDate?: string): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as revenue
      FROM "Transaction"
      WHERE status = 'COMPLETED'
      ${fromDate ? Prisma.sql`AND "createdAt" >= ${fromDate}::timestamp` : Prisma.empty}
      ${toDate ? Prisma.sql`AND "createdAt" <= ${toDate}::timestamp` : Prisma.empty}
      GROUP BY month
      ORDER BY month ASC
    `
  }

  async getTopCoursesByMonth(month: string): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
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

  async getHardLessons(): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
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
}
