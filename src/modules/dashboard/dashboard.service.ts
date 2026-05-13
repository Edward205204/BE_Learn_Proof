import { Injectable } from '@nestjs/common'
import { DashboardRepo } from './dashboard.repo'
import { DashboardOverview, RevenueChartItem } from './dashboard.model'

@Injectable()
export class DashboardService {
  constructor(private repo: DashboardRepo) {}

  async getOverview(): Promise<DashboardOverview> {
    const [users, courses, publishedCourses, enrollments, transactions, revenue] = await this.repo.getOverview()

    return {
      totalUsers: users,
      totalCourses: courses,
      totalPublishedCourses: publishedCourses,
      totalEnrollments: enrollments,
      totalTransactions: transactions,
      totalRevenue: revenue._sum.amount || 0,
    }
  }

  async getRevenueChart(filter: any): Promise<RevenueChartItem[]> {
    return this.repo.getRevenueChart(filter.fromDate, filter.toDate)
  }

  async getTopCoursesByMonth(month: string): Promise<any[]> {
    const data = await this.repo.getTopCoursesByMonth(month)

    return data.map((item: any) => ({
      courseId: item.id,
      title: item.title,
      revenue: Number(item.revenue),
      totalSales: Number(item.total_sales),
    }))
  }

  async getHardLessons(): Promise<any[]> {
    const data = await this.repo.getHardLessons()

    return data.map((item: any) => {
      const notCompleted = Number(item.not_completed)
      const completed = Number(item.completed)
      const total = notCompleted + completed

      return {
        lessonId: item.id,
        title: item.title,
        dropRate: total ? notCompleted / total : 0,
        totalAttempts: total,
      }
    })
  }
}
