import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepo } from './auth.repo'
import { GoogleService } from './google.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo, GoogleService],
  exports: [AuthService], // @Change thay đổi cho admin modules.Rules: Export để AdminModule có thể tái sử dụng ghi DB
})
export class AuthModule {}
