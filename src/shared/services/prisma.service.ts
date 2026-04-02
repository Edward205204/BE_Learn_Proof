import { Injectable, OnModuleInit } from '@nestjs/common'

import envConfig from '../config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new Pool({ connectionString: envConfig.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    super({ adapter })
  }
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
