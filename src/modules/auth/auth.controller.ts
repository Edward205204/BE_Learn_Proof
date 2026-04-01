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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('Auth')
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
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  @ApiBody({ type: LoginBodyDTO })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về accessToken & refreshToken' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  login(@Body() body: LoginBodyDTO) {
    return this.authService.login(body)
  }

  @IsPublic()
  @Post('register')
  @ZodSerializerDto(AuthResDto)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiBody({ type: RegisterBodyDTO })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về thông tin user và tokens' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc email đã tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  @IsPublic()
  @Post('otp/register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gửi mã OTP để xác thực email đăng ký' })
  @ApiBody({ type: SendOtpDTO })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi tới email' })
  @ApiResponse({ status: 400, description: 'Email không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  sendOtpForRegister(@Body() body: SendOtpDTO) {
    return this.authService.sendOtpForRegister(body)
  }

  @IsPublic()
  @Post('forgot-password')
  @HttpCode(200)
  @ZodSerializerDto(MessageResDTO)
  @ApiOperation({ summary: 'Yêu cầu đặt lại mật khẩu – gửi OTP qua email' })
  @ApiBody({ type: ForgotPassworDto })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi tới email đăng ký' })
  @ApiResponse({ status: 400, description: 'Email không hợp lệ hoặc không tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  forgotPassword(@Body() body: ForgotPassworDto) {
    return this.authService.forgotPassword(body)
  }

  @IsPublic()
  @Post('forgot-password/verify')
  @HttpCode(200)
  @ZodSerializerDto(MessageResDTO)
  @ApiOperation({ summary: 'Xác minh mã OTP để đặt lại mật khẩu' })
  @ApiBody({ type: ForgotPasswordVerifyDto })
  @ApiResponse({ status: 200, description: 'Xác minh OTP thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không đúng hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  forgotPasswordVerify(@Body() body: ForgotPasswordVerifyDto) {
    return this.authService.forgotPasswordVerify(body)
  }

  @IsPublic()
  @Post('reset-password')
  @HttpCode(200)
  @ZodSerializerDto(MessageResDTO)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới sau khi xác minh OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Mật khẩu đã được đặt lại thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc token hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body)
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(UserResSchema)
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng hiện tại' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getMe(@ActiveUser() payload: TokenPayload) {
    return this.authService.getMe(payload)
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(UserResSchema)
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (bio, headline, website, fullName)' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công, trả về thông tin mới' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  updateProfile(@ActiveUser() payload: TokenPayload, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(payload.userId, body)
  }

  @Get('google-link')
  @IsPublic()
  @ApiOperation({ summary: 'Lấy URL đăng nhập bằng Google OAuth2' })
  @ApiResponse({ status: 200, description: 'Trả về URL chuyển hướng Google' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getAuthorizationUrl() {
    return this.googleService.getAuthorizationUrl()
  }

  @Get('google/callback')
  @IsPublic()
  @ApiOperation({ summary: 'Callback sau khi Google xác thực (redirect tự động)' })
  @ApiResponse({ status: 302, description: 'Chuyển hướng về FE kèm token' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
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
