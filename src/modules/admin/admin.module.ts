import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminUsersController } from './controllers/admin-users.controller'
import { AdminUsersService } from './services/admin-users.service'
import { AdminUsersRepo } from './repos/admin-users.repo'
import { AdminSettingsController } from './controllers/admin-settings.controller'
import { AdminSettingsService } from './services/admin-settings.service'
import { AdminCoursesController } from './controllers/admin-courses.controller'
import { AdminCoursesService } from './services/admin-courses.service'
import { AdminCoursesRepo } from './repos/admin-courses.repo'
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller'
import { AdminAuditLogsService } from './services/admin-audit-logs.service'
import { AdminAuditLogsRepo } from './repos/admin-audit-logs.repo'

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController, AdminSettingsController, AdminCoursesController, AdminAuditLogsController],
  providers: [
    AdminUsersService,
    AdminUsersRepo,
    AdminSettingsService,
    AdminCoursesService,
    AdminCoursesRepo,
    AdminAuditLogsService,
    AdminAuditLogsRepo,
  ],
})
export class AdminModule {}
