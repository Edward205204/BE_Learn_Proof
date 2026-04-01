import { Body, Controller, Get, HttpCode, Patch, Post, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { AuthService } from './auth.service'
import {
  ForgotPassworDto,
  ForgotPasswordVerifyDto,
  LoginBodyDTO,
  RegisterBodyDTO,
  ResetPasswordDto,
  SendOtpDTO,
  UpdateProfileDto,
} from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthResDto, UserResSchema } from './auth.model'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { MessageResDTO } from 'src/shared/models/message.model'
import { GoogleService } from './google.service'
import envConfig from 'src/shared/config'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
  ) {}

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

  @Get('me')
  @ZodSerializerDto(UserResSchema)
  getMe(@ActiveUser() payload: TokenPayload) {
    return this.authService.getMe(payload)
  }

  @Patch('me')
  @ZodSerializerDto(UserResSchema)
  updateProfile(@ActiveUser() payload: TokenPayload, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(payload.userId, body)
  }

  @Get('google-link')
  @IsPublic()
  // @ZodSerializerDto(GetAuthorizationUrlResType)
  getAuthorizationUrl() {
    return this.googleService.getAuthorizationUrl()
  }

  @Get('google/callback')
  @IsPublic()
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const data = await this.googleService.googleCallback({
        code,
      })

      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại bằng cách khác'
      return res.redirect(`${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?errorMessage=${message}`)
    }
  }
}
