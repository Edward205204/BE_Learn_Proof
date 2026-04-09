import { ArgumentsHost, BadRequestException, Catch, NotFoundException } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { isForeignKeyConstraintPrismaError, isNotFoundPrismaError, isUniqueConstraintPrismaError } from '../helpers'

@Catch(PrismaClientKnownRequestError)
export class DatabaseExceptionFilter extends BaseExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    if (isNotFoundPrismaError(exception)) {
      super.catch(new NotFoundException('Không tìm thấy tài nguyên'), host)
      return
    }
    if (isUniqueConstraintPrismaError(exception)) {
      super.catch(new BadRequestException('Lỗi tranh chấp tài nguyên'), host)
      return
    }

    if (isForeignKeyConstraintPrismaError(exception)) {
      super.catch(new BadRequestException('Lỗi liên kết tài nguyên'), host)
      return
    }
    super.catch(exception, host)
  }
}
