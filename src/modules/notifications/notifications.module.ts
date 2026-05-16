import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { NotificationsRepo } from './notifications.repo'

@Module({
  providers: [NotificationsService, NotificationsRepo],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
