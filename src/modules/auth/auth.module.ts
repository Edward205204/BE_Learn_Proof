import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepo } from './auth.repo'

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo],
})
export class AuthModule {}
