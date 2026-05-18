import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import envConfig from '../config'

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: { host: envConfig.REDIS_HOST, port: envConfig.REDIS_PORT },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
    }),
  ],
})
export class QueueModule {}
