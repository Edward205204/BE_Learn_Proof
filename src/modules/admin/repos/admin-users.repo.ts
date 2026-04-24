import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Prisma, PrismaClient } from 'src/generated/prisma/client'
import { GetUsersQueryType } from '../admin.model'

@Injectable()
export class AdminUsersRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  async getUsersPaging(query: GetUsersQueryType) {
    const { page, limit, role, search, sort } = query
    const skip = (page - 1) * limit

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const sortMapping: Record<string, Prisma.UserOrderByWithRelationInput> = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      'name-asc': { fullName: 'asc' },
      'name-desc': { fullName: 'desc' },
    }

    const orderBy = sortMapping[sort ?? 'newest']

    const [users, total] = await Promise.all([
      this.txHost.tx.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          fullName: true,
          avatar: true,
          role: true,
          provider: true,
          createdAt: true,
          _count: {
            select: {
              coursesCreated: true,
              enrollments: true,
            },
          },
        },
      }),
      this.txHost.tx.user.count({ where }),
    ])

    return {
      items: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  getUserDetail(id: string) {
    return this.txHost.tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        bio: true,
        headline: true,
        website: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }
}
