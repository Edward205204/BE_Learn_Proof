import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class AdminSettingsRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  async findAll() {
    return await this.txHost.tx.systemSetting.findMany({
      orderBy: { key: 'asc' },
    })
  }

  async findByKey(key: string) {
    return this.txHost.tx.systemSetting.findUnique({
      where: { key },
    })
  }

  async upsert(key: string, value: any) {
    return this.txHost.tx.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }
}
