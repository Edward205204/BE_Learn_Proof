import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import CustomZodValidationPipe from './shared/pipes/z-validation.pipe'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { DatabaseExceptionFilter } from './shared/filters/database-exc.filter'
import { HttpExceptionFilter } from './shared/filters/http-exc.filter'
import { TransformInterceptor } from './shared/interceptor/transform.interceptor'
import { SharedModule } from './shared/shared.module'
import { CoursesModule } from './modules/courses/courses.module'
import { QuizModule } from './modules/quiz/quiz.module'
import { InteractionModule } from './modules/interaction/interaction.module'
import { MediaModule } from './modules/media/media.module'
import { CartModule } from './modules/cart/cart.module'
import { WishlistModule } from './modules/wishlist/wishlist.module'
import { PrismaService } from './shared/services/prisma.service'
import { ClsModule } from 'nestjs-cls'
import { ClsPluginTransactional } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { EnrollmentModule } from './modules/enrollment/enrollment.module'
import { LessonModule } from './modules/lesson/lesson.module'
import { BlockchainModule } from './modules/blockchain/blockchain.module'
import { IpfsModule } from './modules/ipfs/ipfs.module'
import { PaymentModule } from './modules/payment/payment.module'

@Module({
  imports: [
    AuthModule,
    SharedModule,
    CoursesModule,
    QuizModule,
    InteractionModule,
    MediaModule,
    CartModule,
    WishlistModule,
    LessonModule,

    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [SharedModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    }),

    EnrollmentModule,
    BlockchainModule,
    IpfsModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    // tạm ẩn.
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TransformInterceptor,
    // },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
