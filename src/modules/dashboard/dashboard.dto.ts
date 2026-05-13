import { createZodDto } from 'nestjs-zod'
import {
  DashboardFilterSchema,
  DashboardOverviewSchema,
  RevenueChartItemSchema,
  RevenueChartResponseSchema,
} from './dashboard.model'

// request
export class DashboardFilterDto extends createZodDto(DashboardFilterSchema) {}

// response
export class DashboardOverviewDto extends createZodDto(DashboardOverviewSchema) {}
export class RevenueChartItemDto extends createZodDto(RevenueChartItemSchema) {}
export class RevenueChartResponseDto extends createZodDto(RevenueChartResponseSchema) {}
