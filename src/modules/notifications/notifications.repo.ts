import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { NotificationType } from 'src/generated/prisma/client'

@Injectable()
export class NotificationsRepo {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(data: {
    userId: string
    type: NotificationType
    title: string
    message: string
    link?: string
  }) {
    return this.prisma.notification.create({ data })
  }

  createManyNotifications(
    notifications: {
      userId: string
      type: NotificationType
      title: string
      message: string
      link?: string
    }[],
  ) {
    return this.prisma.notification.createMany({ data: notifications })
  }

  findByUserId(userId: string, skip = 0, take = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } })
  }

  markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    })
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }
}
