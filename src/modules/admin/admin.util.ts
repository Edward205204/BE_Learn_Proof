import { ForbiddenException } from '@nestjs/common'
import { Role } from 'src/generated/prisma/enums'
import { TokenPayload } from 'src/shared/types/jwt.type'

export function checkAdmin(user: TokenPayload) {
  if (user.role !== Role.ADMIN) {
    throw new ForbiddenException('Access denied. Administrator right is required.')
  }
}
