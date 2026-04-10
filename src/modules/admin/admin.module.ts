import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminUsersController } from './controllers/admin-users.controller'
import { AdminUsersService } from './services/admin-users.service'
import { AdminUsersRepo } from './repos/admin-users.repo'

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminUsersRepo],
})
export class AdminModule {}
