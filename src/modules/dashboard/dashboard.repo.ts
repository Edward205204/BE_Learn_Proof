import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from 'src/generated/prisma/client'
import { Prisma } from 'src/generated/prisma/client'

import { PaymentStatus, CourseStatus } from 'src/generated/prisma/enums'

@Injectable()
export class DashboardRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  getOverview(): Promise<[number, number, number, number, number, { _sum: { amount: number | null } }]> {
    return Promise.all([
      this.txHost.tx.user.count({ where: { deletedAt: null } }),
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
      ${fromDate ? Prisma.sql`AND "createdAt" >= ${fromDate}::timestamp` : Prisma.empty}
      ${toDate ? Prisma.sql`AND "createdAt" <= ${toDate}::timestamp` : Prisma.empty}
      GROUP BY month
      ORDER BY month ASC
    `
  }

  getTopCoursesByMonth(month: string) {
    return this.txHost.tx.$queryRaw<any[]>`
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

  getHardLessons() {
    return this.txHost.tx.$queryRaw<any[]>`
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
