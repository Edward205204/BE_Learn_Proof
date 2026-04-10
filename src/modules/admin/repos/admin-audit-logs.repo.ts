import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'
import { GetAuditLogsQueryType } from '../admin.model'

@Injectable()
export class AdminAuditLogsRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  async getAuditLogsPaging(query: GetAuditLogsQueryType) {
    const { page, limit, adminId, action, entity } = query
    const skip = (page - 1) * limit

    const where: any = {}
    if (adminId) where.adminId = adminId
    if (action) where.action = action
    if (entity) where.entity = entity

    const [items, total] = await Promise.all([
      this.txHost.tx.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.txHost.tx.auditLog.count({ where }),
    ])

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
