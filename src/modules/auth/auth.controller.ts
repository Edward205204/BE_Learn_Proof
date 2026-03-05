import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  ForgotPassworDto,
  ForgotPasswordVerifyDto,
  LoginBodyDTO,
  RegisterBodyDTO,
  ResetPasswordDto,
  SendOtpDTO,
} from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthResDto } from './auth.model'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { MessageResDTO } from 'src/shared/models/message.model'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @IsPublic()
  @Post('login')
  @ZodSerializerDto(AuthResDto)
  @HttpCode(200)
  login(@Body() body: LoginBodyDTO) {
    return this.authService.login(body)
  }

  @IsPublic()
  @Post('register')
  @ZodSerializerDto(AuthResDto)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  @IsPublic()
  @Post('otp/register')
  @HttpCode(200)
  sendOtpForRegister(@Body() body: SendOtpDTO) {
    return this.authService.sendOtpForRegister(body)
  }

  @IsPublic()
  @Post('forgot-password')
  @HttpCode(200)
  @ZodSerializerDto(MessageResDTO)
  forgotPassword(@Body() body: ForgotPassworDto) {
    return this.authService.forgotPassword(body)
  }

  @IsPublic()
  @Post('forgot-password/verify')
  @HttpCode(200)
  @ZodSerializerDto(MessageResDTO)
  forgotPasswordVerify(@Body() body: ForgotPasswordVerifyDto) {
    return this.authService.forgotPasswordVerify(body)
  }

  @IsPublic()
  @Post('reset-password')
  @HttpCode(200)
  @ZodSerializerDto(MessageResDTO)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body)
  }
}
