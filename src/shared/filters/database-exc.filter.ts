import { ArgumentsHost, BadRequestException, Catch, HttpException, Logger, NotFoundException } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '../helpers'

@Catch(HttpException)
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
    super.catch(exception, host)
  }
}
