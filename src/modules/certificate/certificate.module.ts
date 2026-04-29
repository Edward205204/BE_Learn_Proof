import { Module } from '@nestjs/common'
import { CertificateService } from './certificate.service'
import { CertificateController } from './certificate.controller'
import { CertificateRepo } from './certificate.repo'
import { EnrollmentRepo } from '../enrollment/enrollment.repo'

@Module({
  providers: [CertificateService, CertificateRepo, EnrollmentRepo],
  controllers: [CertificateController],
})
export class CertificateModule {}
