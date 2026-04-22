import { Module } from '@nestjs/common'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { CartRepo } from './cart.repo'
import { CoursesModule } from '../courses/courses.module'
import { EnrollmentModule } from '../enrollment/enrollment.module'

@Module({
  imports: [CoursesModule, EnrollmentModule],
  controllers: [CartController],
  providers: [CartService, CartRepo],
  exports: [CartService],
})
export class CartModule {}
