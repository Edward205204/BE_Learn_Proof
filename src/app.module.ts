import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import CustomZodValidationPipe from './shared/pipes/z-validation.pipe'
import { ZodSerializerInterceptor } from 'nestjs-zod'
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
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
