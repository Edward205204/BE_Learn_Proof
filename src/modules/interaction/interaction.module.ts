import { Module } from '@nestjs/common'
import { InteractionController } from './interaction.controller'
import { InteractionService } from './interaction.service'
import { InteractionRepo } from './interaction.repo'
import { PrismaService } from 'src/shared/services/prisma.service'

@Module({
  controllers: [InteractionController],
  providers: [InteractionService, InteractionRepo, PrismaService],
})
export class InteractionModule {}
