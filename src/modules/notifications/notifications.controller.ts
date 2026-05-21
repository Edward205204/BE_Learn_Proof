import { Controller, Get, Patch, Param, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Controller('notifications')
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Lấy danh sách thông báo của user (phân trang)
   */
  @Get()
  getMyNotifications(
    @ActiveUser() user: TokenPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    )
  }

  /**
   * GET /notifications/unread-count
   * Đếm số thông báo chưa đọc
   */
  @Get('unread-count')
  async getUnreadCount(@ActiveUser() user: TokenPayload) {
    const count = await this.notificationsService.getUnreadCount(user.userId)
    return { count }
  }

  /**
   * PATCH /notifications/read-all
   * Đánh dấu tất cả đã đọc
   */
  @Patch('read-all')
  markAllAsRead(@ActiveUser() user: TokenPayload) {
    return this.notificationsService.markAllAsRead(user.userId)
  }

  /**
   * PATCH /notifications/:id/read
   * Đánh dấu 1 thông báo đã đọc
   */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @ActiveUser() user: TokenPayload) {
    return this.notificationsService.markAsRead(id, user.userId)
  }
}
