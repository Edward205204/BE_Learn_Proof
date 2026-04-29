import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Injectable } from '@nestjs/common'
import { CertMintStatus, PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class CertificateRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  findByUserAndCourse(userId: string, courseId: string) {
    return this.txHost.tx.certificate.findFirst({
      where: { userId, courseId },
    })
  }

  createCertificate(data: {
    userId: string
    courseId: string
    certificateHash: string
    txHash: string
    tokenId?: string
    ipfsHash?: string
    status: CertMintStatus
  }) {
    return this.txHost.tx.certificate.create({ data })
  }

  updateCertificate(id: string, data: Partial<{ txHash: string; tokenId: string; status: CertMintStatus }>) {
    return this.txHost.tx.certificate.update({ where: { id }, data })
  }

  getMyCertificates(userId: string) {
    return this.txHost.tx.certificate.findMany({
      where: { userId, status: CertMintStatus.COMPLETED },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    })
  }
}
