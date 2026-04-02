import { Module } from '@nestjs/common'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CoursesModule } from '../courses/courses.module'

@Module({
  imports: [CoursesModule],
  controllers: [CartController],
  providers: [CartService, PrismaService],
  exports: [CartService],
})
export class CartModule {}
