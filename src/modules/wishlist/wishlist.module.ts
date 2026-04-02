import { Module } from '@nestjs/common'
import { WishlistController } from './wishlist.controller'
import { WishlistService } from './wishlist.service'
import { PrismaService } from '../../shared/services/prisma.service'
import { CoursesModule } from '../courses/courses.module'

@Module({
  imports: [CoursesModule],
  controllers: [WishlistController],
  providers: [WishlistService, PrismaService],
  exports: [WishlistService],
})
export class WishlistModule {}
