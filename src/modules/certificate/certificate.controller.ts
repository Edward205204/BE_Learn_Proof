import { Controller, Get, Post, Param } from '@nestjs/common'
import { CertificateService } from './certificate.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  MintCertificateResponseSchema,
  MyCertificatesResponseSchema,
  PublicCertificateResponseSchema,
} from './certificate.response'
import { IsPublic } from 'src/shared/decorators/auth.decorator'

@Controller('certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post('mint/:courseId')
  @ZodSerializerDto(MintCertificateResponseSchema)
  mintCertificate(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.certificateService.mintCertificate(user.userId, courseId)
  }

  @Get('me')
  @ZodSerializerDto(MyCertificatesResponseSchema)
  getMyCertificates(@ActiveUser() user: TokenPayload) {
    return this.certificateService.getMyCertificates(user.userId)
  }

  @Get('public/:hash')
  @IsPublic()
  @ZodSerializerDto(PublicCertificateResponseSchema)
  getPublicCertificate(@Param('hash') hash: string) {
    return this.certificateService.getPublicCertificate(hash)
  }
}
