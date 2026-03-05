import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepo } from './auth.repo'
import { GoogleService } from './google.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo, GoogleService],
})
export class AuthModule {}
