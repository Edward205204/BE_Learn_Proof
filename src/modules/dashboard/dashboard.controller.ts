import { Controller, Get, Query } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardFilterDto, DashboardOverviewDto, RevenueChartResponseDto } from './dashboard.dto'

@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('revenue')
  getRevenue(@Query() query: DashboardFilterDto): Promise<RevenueChartResponseDto> {
    return this.service.getRevenueChart(query)
  }

  @Get('overview')
  getOverview(): Promise<DashboardOverviewDto> {
    return this.service.getOverview()
  }

  @Get('top-courses')
  getTopCourses(@Query('month') month: string) {
    return this.service.getTopCoursesByMonth(month)
  }

  @Get('hard-lessons')
  getHardLessons() {
    return this.service.getHardLessons()
  }
}
