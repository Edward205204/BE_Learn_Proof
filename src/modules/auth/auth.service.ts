import { Injectable } from '@nestjs/common'
import {
  AuthResType,
  ForgotPasswordBodyType,
  ForgotPasswordVerifyBodyType,
  LoginBodyType,
  RegisterBodyType,
  ResetPasswordBodyType,
  SendOtpBodyType,
  UpdateProfileBodySchema,
} from './auth.model'
import { z } from 'zod'
import { AuthRepo } from './auth.repo'
import {
  EmailAlreadyExistsAndCannotSendOtpException,
  EmailAlreadyExistsException,
  EmailNotFoundException,
  EmailOrPasswordInvalidException,
  InvalidForgotPasswordCodeException,
  InvalidVerificationCodeException,
  OTPAwaitTimeExpiredException,
  UserNotFoundException,
} from './error.model'
import { TokenService } from 'src/shared/services/token.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { Role, VerificationCodeType } from 'src/generated/prisma/enums'
import { MailService } from 'src/shared/services/mail.service'
import { addMilliseconds } from 'date-fns'
import ms, { StringValue } from 'ms'
import envConfig from 'src/shared/config'
import { generateOTP } from './auth.util'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
    private readonly tokenService: TokenService,
    private readonly hashingService: HashingService,
    private readonly mailService: MailService,
  ) {}

  async generateAndSaveTokens(payload: { userId: string; role: Role }) {
    const [accessToken, refreshToken] = await this.tokenService.generateTokens({
      userId: payload.userId,
      role: payload.role,
    })
    const refreshTokenDecode = await this.tokenService.decodeToken(refreshToken)
    await this.authRepo.createRefreshToken({
      token: refreshToken,
      userId: payload.userId,
      expiresAt: new Date(refreshTokenDecode.exp * 1000),
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  async login(body: LoginBodyType): Promise<AuthResType> {
    const { email, password } = body
    const user = await this.authRepo.findUserUnique({ email })
    if (!user) throw new EmailOrPasswordInvalidException()
    const isPasswordValid = await this.hashingService.compare(password, user.password)
    if (!isPasswordValid) throw new EmailOrPasswordInvalidException()

    const { accessToken, refreshToken } = await this.generateAndSaveTokens({ userId: user.id, role: user.role })

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio ?? null,
        headline: user.headline ?? null,
        website: user.website ?? null,
        role: user.role,
      },
    }
  }

  async register(body: RegisterBodyType): Promise<AuthResType> {
    const { email, fullName, password, code } = body
    const user = await this.authRepo.findUserUnique({ email })
    if (user) throw new EmailAlreadyExistsException()

    const verificationCode = await this.authRepo.findCodeByEmailAndType({ email, type: VerificationCodeType.REGISTER })
    if (!verificationCode) throw new InvalidVerificationCodeException()
    if (verificationCode.code !== code || verificationCode.expiresAt < new Date())
      throw new InvalidVerificationCodeException()

    const hashedPassword = await this.hashingService.hash(password)

    const newUser = await this.authRepo.createUser({
      email,
      fullName,
      password: hashedPassword,
    })
    const { accessToken, refreshToken } = await this.generateAndSaveTokens({ userId: newUser.id, role: newUser.role })
    return {
      tokens: { accessToken, refreshToken },
      user: {
        ...newUser,
      },
    }
  }

  async sendOtpForRegister(body: SendOtpBodyType) {
    const { email } = body
    const user = await this.authRepo.findUserUnique({ email })

    if (user) throw new EmailAlreadyExistsAndCannotSendOtpException()

    const verificationCode = await this.authRepo.findVerificationCode({
      email: email,
      type: VerificationCodeType.REGISTER,
    })

    if (verificationCode) {
      const nextAvailableSendTime = addMilliseconds(
        verificationCode.updatedAt,
        ms(envConfig.OTP_BUFFER_TIME as StringValue),
      )

      if (nextAvailableSendTime > new Date()) throw new OTPAwaitTimeExpiredException()
    }

    const otp = generateOTP()

    await this.authRepo.createVerificationCode({
      email: email,
      code: otp,
      type: VerificationCodeType.REGISTER,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN as StringValue)),
    })

    const emailResponse = await this.mailService.sendOtp(email, otp)

    if (emailResponse.error) {
      console.log(emailResponse.error.message)
    }

    return { message: 'OTP sent successfully' }
  }

  async forgotPassword(body: ForgotPasswordBodyType) {
    const { email } = body
    const user = await this.authRepo.findUserUnique({ email })
    if (!user) throw new EmailNotFoundException()

    const otp = generateOTP()
    await this.authRepo.createVerificationCode({
      email,
      code: otp,
      type: VerificationCodeType.FORGOT_PASSWORD,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN as StringValue)),
    })

    const link = `${envConfig.FE_URL}/reset-password?email=${email}&code=${otp}`
    const emailResponse = await this.mailService.sendLink(email, link)

    if (emailResponse.error) {
      console.log(emailResponse.error.message)
    }

    return { message: 'Link sent successfully' }
  }

  async forgotPasswordVerify(body: ForgotPasswordVerifyBodyType) {
    const { email, code } = body
    const verifyCode = await this.authRepo.findVerificationCode({
      email,
      code,
      type: VerificationCodeType.FORGOT_PASSWORD,
    })

    if (!verifyCode || verifyCode.expiresAt < new Date() || verifyCode.code !== code)
      throw new InvalidForgotPasswordCodeException()
    return { message: 'Xác thực đường dẫn thành công!' }
  }

  async resetPassword(body: ResetPasswordBodyType) {
    const { email, password } = body
    const user = await this.authRepo.findUserUnique({ email })
    if (!user) throw new EmailNotFoundException()
    const hashedPassword = await this.hashingService.hash(password)
    await this.authRepo.updateUser({ where: { email }, data: { password: hashedPassword } })

    return { message: 'Mật khẩu đã được đặt lại thành công!' }
  }

  async getMe(payload: TokenPayload) {
    const { userId } = payload
    const user = await this.authRepo.findUserUnique({ id: userId })
    if (!user) throw new UserNotFoundException()
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      headline: user.headline,
      website: user.website,
      role: user.role,
    }
  }

  async updateProfile(userId: string, data: z.infer<typeof UpdateProfileBodySchema>) {
    const user = await this.authRepo.findUserUnique({ id: userId })
    if (!user) throw new UserNotFoundException()
    const updated = await this.authRepo.updateUser({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(data.headline !== undefined && { headline: data.headline || null }),
        ...(data.website !== undefined && { website: data.website || null }),
      },
    })
    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      avatar: updated.avatar,
      bio: updated.bio,
      headline: updated.headline,
      website: updated.website,
      role: updated.role,
    }
  }
}
