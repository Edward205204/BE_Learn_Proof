import { Injectable } from '@nestjs/common'

import envConfig from '../config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const pool = new Pool({ connectionString: envConfig.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    super({ adapter })
  }
  async onModuleInit() {
    await this.$connect()
  }
}
