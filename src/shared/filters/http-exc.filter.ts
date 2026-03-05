import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { ZodSerializationException } from 'nestjs-zod'
import { ZodError } from 'zod'

@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: HttpException, host: ArgumentsHost) {
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError()
      if (zodError instanceof ZodError) {
        const details = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        this.logger.error(`[Data response sai] => ${details}`)
      }
    }

    super.catch(exception, host)
  }
}
