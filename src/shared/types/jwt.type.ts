import { Role } from '@prisma/client'

export interface TokenPayload {
  userId: string
  exp: number
  iat: number
  role: Role
}
