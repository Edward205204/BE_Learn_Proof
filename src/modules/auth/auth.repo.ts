import { Injectable } from '@nestjs/common'
import { RefreshToken, User, VerificationCode, VerificationCodeType } from 'src/generated/prisma/client'

import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AuthRepo {
  constructor(private readonly prisma: PrismaService) {}

  findUserUnique(body: { email: string } | { id: string }) {
    return this.prisma.user.findUnique({
      where: body,
    })
  }

  findCodeByEmailAndType(body: { email: string; type: VerificationCodeType }) {
    return this.prisma.verificationCode.findFirst({
      where: body,
    })
  }

  createRefreshToken(payload: Omit<RefreshToken, 'createdAt'>) {
    return this.prisma.refreshToken.create({
      data: payload,
    })
  }

  createUser(payload: Pick<User, 'email' | 'fullName' | 'password'>) {
    return this.prisma.user.create({
      data: payload,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        role: true,
      },
    })
  }

  findVerificationCode(
    body:
      | { email: string; type: VerificationCodeType }
      | { email: string; code: string }
      | { email: string; type: VerificationCodeType; code: string },
  ) {
    return this.prisma.verificationCode.findFirst({
      where: body,
    })
  }

  createVerificationCode(payload: Pick<VerificationCode, 'email' | 'code' | 'type' | 'expiresAt'>) {
    return this.prisma.verificationCode.create({
      data: payload,
    })
  }
}
