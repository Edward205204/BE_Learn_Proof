import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { RefreshToken, User, VerificationCode, VerificationCodeType } from 'src/generated/prisma/client'

@Injectable()
export class AuthRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  findUserUnique(body: { email: string } | { id: string }) {
    return this.txHost.tx.user.findUnique({
      where: body,
    })
  }

  findCodeByEmailAndType(body: { email: string; type: VerificationCodeType }) {
    return this.txHost.tx.verificationCode.findFirst({
      where: body,
    })
  }

  createRefreshToken(payload: Omit<RefreshToken, 'createdAt'>) {
    return this.txHost.tx.refreshToken.create({
      data: payload,
    })
  }

  createUser(payload: Pick<User, 'email' | 'fullName' | 'password'> & { avatar?: string }) {
    return this.txHost.tx.user.create({
      data: payload,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        bio: true,
        headline: true,
        website: true,
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
    return this.txHost.tx.verificationCode.findFirst({
      where: body,
    })
  }

  updateUser(payload: { where: { email: string } | { id: string }; data: Partial<User> }) {
    return this.txHost.tx.user.update({
      where: payload.where,
      data: payload.data,
    })
  }

  createVerificationCode(payload: Pick<VerificationCode, 'email' | 'code' | 'type' | 'expiresAt'>) {
    return this.txHost.tx.verificationCode.upsert({
      where: {
        email_type: {
          email: payload.email,
          type: payload.type,
        },
      },
      update: {
        code: payload.code,
        expiresAt: payload.expiresAt,
      },
      create: payload,
    })
  }
}
