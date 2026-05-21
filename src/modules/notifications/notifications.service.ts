import { Injectable } from '@nestjs/common'
import { NotificationsRepo } from './notifications.repo'
import { NotificationType } from 'src/generated/prisma/client'

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepo: NotificationsRepo) {}

  /** Tạo 1 thông báo cho 1 user */
  notify(data: { userId: string; type: NotificationType; title: string; message: string; link?: string }) {
    return this.notificationsRepo.createNotification(data)
  }

  /** Tạo thông báo hàng loạt (gửi cho nhiều user) */
  notifyMany(
    userIds: string[],
    data: { type: NotificationType; title: string; message: string; link?: string },
  ) {
    if (!userIds.length) return Promise.resolve()
    return this.notificationsRepo.createManyNotifications(
      userIds.map((userId) => ({ userId, ...data })),
    )
  }

  /** Lấy danh sách thông báo của user (phân trang) */
  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [notifications, unreadCount] = await Promise.all([
      this.notificationsRepo.findByUserId(userId, skip, limit),
      this.notificationsRepo.countUnread(userId),
    ])
    return { notifications, unreadCount, page, limit }
  }

  /** Đếm số thông báo chưa đọc */
  getUnreadCount(userId: string) {
    return this.notificationsRepo.countUnread(userId)
  }

  /** Đánh dấu 1 thông báo đã đọc */
  markAsRead(id: string, userId: string) {
    return this.notificationsRepo.markAsRead(id, userId)
  }

  /** Đánh dấu tất cả thông báo đã đọc */
  markAllAsRead(userId: string) {
    return this.notificationsRepo.markAllAsRead(userId)
  }
}
