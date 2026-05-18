import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { createHash } from 'crypto'
import { CertMintStatus } from 'src/generated/prisma/client'
import { BlockchainService } from '../blockchain/blockchain.service'
import { EnrollmentRepo } from '../enrollment/enrollment.repo'
import { CertificateRepo } from './certificate.repo'

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name)

  constructor(
    private readonly certRepo: CertificateRepo,
    private readonly enrollRepo: EnrollmentRepo,
    private readonly blockchainService: BlockchainService,
  ) {}

  async mintCertificate(userId: string, courseId: string) {
    // 1. Kiểm tra đã đăng ký khóa học chưa
    const enrollment = await this.enrollRepo.getEnrollmentUnique(userId, courseId)
    if (!enrollment) throw new ForbiddenException('Bạn chưa đăng ký khóa học này')

    // 2. Kiểm tra hoàn thành 100%
    const progressMap = await this.enrollRepo.getProgressSummariesByCourseIds(userId, [courseId])
    const progress = progressMap.get(courseId)
    if (!progress || progress.progressPercent < 100) {
      throw new BadRequestException('Bạn chưa hoàn thành 100% khóa học')
    }

    // 3. Kiểm tra chứng chỉ đã được mint chưa
    const existing = await this.certRepo.findByUserAndCourse(userId, courseId)
    if (existing && existing.status === CertMintStatus.COMPLETED) {
      // Trả về chứng chỉ đã có thay vì lỗi
      return existing
    }

    // 4. Tạo hash duy nhất cho chứng chỉ
    const certHash = '0x' + createHash('sha256').update(`${userId}:${courseId}:${Date.now()}`).digest('hex')
    const certificateId = `CT-${courseId.slice(0, 8).toUpperCase()}`

    // 5. Tạo bản ghi Certificate với trạng thái MINTING
    let cert = await this.certRepo.createCertificate({
      userId,
      courseId,
      certificateHash: certHash,
      txHash: '',
      status: CertMintStatus.MINTING,
    })

    try {
      // 6. Gọi Smart Contract để mint (địa chỉ nhận = địa chỉ ví của backend do user chưa có wallet)
      this.logger.log(`Minting certificate for user ${userId}, course ${courseId}...`)

      // Build chuẩn metadata của 1 NFT/SBT (có thể xem trên bất kỳ NFT Viewer nào)
      const metadata = {
        name: `LearnProof Certificate - ${courseId.slice(0, 8).toUpperCase()}`,
        description: `Chứng chỉ hoàn thành khóa học được cấp bởi nền tảng LearnProof.`,
        image: `${process.env.FE_URL ?? 'http://localhost:3001'}/certificate/${certificateId}/image`,
        attributes: [
          { trait_type: 'User ID', value: userId },
          { trait_type: 'Course ID', value: courseId },
          { trait_type: 'Certificate ID', value: certificateId },
          { trait_type: 'Issued At', value: new Date().toISOString() },
          { trait_type: 'Platform', value: 'LearnProof' },
        ],
      }

      // Upload metadata lên Pinata IPFS để lấy link phi tập trung
      const ipfsUri = await this.blockchainService.uploadMetadataToIPFS(metadata)
      this.logger.log(`📦 Metadata IPFS URI: ${ipfsUri}`)

      // Dùng địa chỉ ví BE (Admin Wallet) làm người nhận (vì user chưa có MetaMask)
      // Khi hệ thống hỗ trợ wallet user sau này sẽ thay thế
      const adminWallet = this.blockchainService.getAdminWalletAddress()
      const receipt = await this.blockchainService.mintCertificate(
        adminWallet, // mint về ví admin
        ipfsUri,
        certHash,
      )

      // 7. Cập nhật DB với txHash thật
      cert = await this.certRepo.updateCertificate(cert.id, {
        txHash: receipt.txHash,
        status: CertMintStatus.COMPLETED,
      })

      this.logger.log(`✅ Certificate minted! txHash: ${receipt.txHash}`)
      return cert
    } catch (error) {
      // Rollback: đánh dấu thất bại
      await this.certRepo.updateCertificate(cert.id, { status: CertMintStatus.FAILED })
      this.logger.error(`❌ Mint failed: ${error.message}`)
      throw new BadRequestException(`Lỗi khi cấp chứng chỉ lên Blockchain: ${error.message}`)
    }
  }

  async getMyCertificates(userId: string) {
    return this.certRepo.getMyCertificates(userId)
  }

  async getPublicCertificate(certificateHash: string) {
    const cert = await this.certRepo.getPublicCertificate(certificateHash)
    if (!cert || cert.status !== CertMintStatus.COMPLETED) {
      throw new NotFoundException('Chứng chỉ không tồn tại hoặc chưa được xác nhận trên Blockchain')
    }
    return cert
  }
}
