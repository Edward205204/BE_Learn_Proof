import { Injectable } from '@nestjs/common'
import { AuthResType, LoginBodyType, RegisterBodyType } from './auth.model'
import { AuthRepo } from './auth.repo'
import {
  EmailAlreadyExistsAndCannotSendOtpException,
  EmailAlreadyExistsException,
  EmailOrPasswordInvalidException,
  InvalidVerificationCodeException,
  OTPAwaitTimeExpiredException,
} from './error.model'
import { TokenService } from 'src/shared/services/token.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { Role, VerificationCodeType } from 'src/generated/prisma/enums'
import { MailService } from 'src/shared/services/mail.service'
import { SendOtpDTO } from './auth.dto'
import { addMilliseconds } from 'date-fns'
import ms, { StringValue } from 'ms'
import envConfig from 'src/shared/config'
import { generateOTP } from './auth.util'

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

  async sendOtpForRegister(body: SendOtpDTO) {
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
}
