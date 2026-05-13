import { Injectable, UnauthorizedException } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import envConfig from 'src/shared/config'

import { google } from 'googleapis'
import { AuthRepo } from './auth.repo'

import { v4 as uuidv4 } from 'uuid'
import { HashingService } from 'src/shared/services/hashing.service'
import { AuthService } from './auth.service'
import { Role } from 'src/generated/prisma/client'
import { ADMIN_EMAILS } from './auth.util'

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
      const email = data.email
      const name = data.name

      if (!email) {
        throw new UnauthorizedException('Không thể lấy thông tin email từ Google')
      }

      // 3. Tìm hoặc Tạo user
      let user = await this.authRepo.findUserUnique({ email })

      if (!user) {
        const randomPassword = uuidv4()
        const hashedPassword = await this.hashingService.hash(randomPassword)

        user = await this.authRepo.createUser({
          email: email,
          fullName: name ?? 'Người dùng Google',
          password: hashedPassword,
          avatar: data.picture ?? '',
          role: ADMIN_EMAILS.includes(email) ? Role.ADMIN : Role.LEARNER,
          provider: 'GOOGLE',
        })
      }

      // Lúc này TypeScript vẫn có thể nghĩ user là null nếu logic phức tạp,
      // chúng ta gán vào hằng số để khẳng định user tồn tại (Narrowing)
      const GoogleUser = user
      if (!GoogleUser) {
        throw new UnauthorizedException('Không thể xác thực hoặc tạo người dùng')
      }

      // Tự động nâng cấp quyền Admin nếu email nằm trong danh sách
      let role = GoogleUser.role
      if (ADMIN_EMAILS.includes(GoogleUser.email) && role !== Role.ADMIN) {
        await this.authRepo.updateUser({ where: { id: GoogleUser.id }, data: { role: Role.ADMIN } })
        role = Role.ADMIN
      }

      return await this.authService.generateAndSaveTokens({
        userId: GoogleUser.id,
        role: role,
      })
    } catch (error) {
      console.error('Google Auth Error:', error)
      throw new UnauthorizedException('Xác thực Google thất bại')
    }
  }
}
