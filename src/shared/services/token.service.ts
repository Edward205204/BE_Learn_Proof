import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import envConfig from 'src/shared/config'
import { v4 as uuidv4 } from 'uuid'
import { TokenPayload } from '../types/jwt.type'
@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  decodeToken(token: string): any {
    return this.jwtService.decode(token)
  }

  signAccessToken(payload: Pick<TokenPayload, 'userId' | 'role'>) {
    return this.jwtService.signAsync(
      { ...payload, id: uuidv4() },
      {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN as any,
        algorithm: 'HS256',
      },
    )
  }

  signRefreshToken(payload: Pick<TokenPayload, 'userId' | 'role'>) {
    return this.jwtService.signAsync(
      { ...payload, id: uuidv4() },
      {
        secret: envConfig.REFRESH_TOKEN_SECRET,
        expiresIn: envConfig.REFRESH_TOKEN_EXPIRES_IN as any,
        algorithm: 'HS256',
      },
    )
  }

  generateTokens(payload: Pick<TokenPayload, 'userId' | 'role'>) {
    return Promise.all([this.signAccessToken(payload), this.signRefreshToken(payload)])
  }

  verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    })
  }

  verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.REFRESH_TOKEN_SECRET,
    })
  }
}
