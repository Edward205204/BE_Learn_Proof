import { Injectable, UnauthorizedException } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import envConfig from 'src/shared/config'

import { google } from 'googleapis'
import { AuthRepo } from './auth.repo'

import { v4 as uuidv4 } from 'uuid'
import { HashingService } from 'src/shared/services/hashing.service'
import { AuthService } from './auth.service'
import { User } from 'src/generated/prisma/client'
import { StringFieldUpdateOperationsInput } from 'src/generated/prisma/models'

@Injectable()
export class GoogleService {
  private oauth2Client: OAuth2Client
  constructor(
    private readonly authRepo: AuthRepo,

    private readonly hashingService: HashingService,
    private readonly authService: AuthService,
  ) {
    this.oauth2Client = new OAuth2Client(
      envConfig.GOOGLE_CLIENT_ID,
      envConfig.GOOGLE_CLIENT_SECRET,
      envConfig.GOOGLE_REDIRECT_URI,
    )
  }

  getAuthorizationUrl() {
    const scope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope,
      include_granted_scopes: true,
    })
  }
  async googleCallback({ code }: { code: string }) {
    try {
      // 1. Lấy tokens từ code
      const { tokens } = await this.oauth2Client.getToken(code)

      // TẠO MỘT CLIENT MỚI cho mỗi request để tránh lỗi tranh chấp dữ liệu (Concurrency)
      const client = new OAuth2Client(
        envConfig.GOOGLE_CLIENT_ID,
        envConfig.GOOGLE_CLIENT_SECRET,
        envConfig.GOOGLE_REDIRECT_URI,
      )
      client.setCredentials(tokens)

      // 2. Lấy thông tin user
      const oauth2 = google.oauth2({
        auth: client, // Dùng client riêng cho request này
        version: 'v2',
      })

      const { data } = await oauth2.userinfo.get()

      if (!data.email) {
        throw new UnauthorizedException('Không thể lấy thông tin email từ Google')
      }

      // 3. Tìm hoặc Tạo user
      const user = await this.authRepo.findUserUnique({
        email: data.email,
      })

      const finalUser =
        user ||
        (await (async () => {
          const randomPassword = uuidv4()
          const hashedPassword = await this.hashingService.hash(randomPassword)

          return await this.authRepo.createUser({
            email: data.email as string,
            fullName: data.name ?? '',
            password: hashedPassword,
            avatar: data.picture ?? '',
          })
        })())

      return await this.authService.generateAndSaveTokens({
        userId: finalUser.id,
        role: finalUser.role,
      })
    } catch (error) {
      console.error('Google Auth Error:', error)
      throw new UnauthorizedException('Xác thực Google thất bại')
    }
  }
}
