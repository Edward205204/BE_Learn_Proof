import { Role } from 'src/generated/prisma/enums'

export interface TokenPayload {
  userId: string
  exp: number
  iat: number
  role: Role
}
