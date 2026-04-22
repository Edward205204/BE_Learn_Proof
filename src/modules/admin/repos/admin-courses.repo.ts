import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'
import { GetCoursesQueryType } from '../admin.model'

@Injectable()
export class AdminCoursesRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  async getCoursesPaging(query: GetCoursesQueryType) {
    const { page, limit, status, isBanned, search, sort } = query
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (isBanned !== undefined) where.isBanned = isBanned === 'true'
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    let orderBy: any = { createdAt: 'desc' }
    if (sort === 'oldest') orderBy = { createdAt: 'asc' }
    if (sort === 'price-asc') orderBy = { price: 'asc' }
    if (sort === 'price-desc') orderBy = { price: 'desc' }

    const [items, total] = await Promise.all([
      this.txHost.tx.course.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
          _count: {
            select: { enrollments: true, chapters: true },
          },
        },
      }),
      this.txHost.tx.course.count({ where }),
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

  async getCourseDetail(id: string) {
    return this.txHost.tx.course.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })
  }
}
