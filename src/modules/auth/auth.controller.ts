import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { ForgotPassworDto, ForgotPasswordVerifyDto, LoginBodyDTO, RegisterBodyDTO, SendOtpDTO } from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthResDto } from './auth.model'
import { IsPublic } from 'src/shared/decorators/auth.decorator'

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
  forgotPassword(@Body() body: ForgotPassworDto) {
    return this.authService.forgotPassword(body)
  }

  @IsPublic()
  @Post('forgot-password/verify')
  @HttpCode(200)
  forgotPasswordVerify(@Body() body: ForgotPasswordVerifyDto) {
    return this.authService.forgotPasswordVerify(body)
  }
}
