import { Injectable } from '@nestjs/common'
import { DashboardRepo } from './dashboard.repo'
import { DashboardOverview } from './dashboard.model'

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

  getRevenueChart(filter: any) {
    return this.repo.getRevenueChart(filter.fromDate, filter.toDate)
  }

  async getTopCoursesByMonth(month: string) {
    const data = (await this.repo.getTopCoursesByMonth(month)) as any[]

    return data.map((item) => ({
      courseId: item.id,
      title: item.title,
      revenue: Number(item.revenue),
      totalSales: Number(item.total_sales),
    }))
  }

  async getHardLessons() {
    const data = (await this.repo.getHardLessons()) as any[]

    return data.map((item) => {
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

  async getCartAbandonedCourses() {
    const data = (await this.repo.getCartAbandonedCourses()) as any[]

    return data.map((item) => ({
      courseId: item.id,
      title: item.title,
      cartCount: Number(item.cart_count),
      purchasedCount: Number(item.purchased_count),
      abandonedCount: Number(item.cart_count) - Number(item.purchased_count),
    }))
  }

  async getFallingRatedCourses() {
    const data = (await this.repo.getFallingRatedCourses()) as any[]

    return data.map((item) => ({
      courseId: item.id,
      title: item.title,
      avgRating: Number(item.avg_rating),
      totalReviews: Number(item.total_reviews),
    }))
  }
}
