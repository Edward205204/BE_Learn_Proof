import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import CustomZodValidationPipe from './shared/pipes/z-validation.pipe'
import { ZodSerializerInterceptor } from 'nestjs-zod'

@Module({
  imports: [AuthModule],
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
