import { Role } from 'src/generated/prisma'

export interface TokenPayload {
  userId: string
  exp: number
  iat: number
  role: Role
}
