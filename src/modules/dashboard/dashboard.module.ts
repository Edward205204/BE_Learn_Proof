import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { DashboardRepo } from './dashboard.repo'

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepo],
})
export class DashboardModule {}
