import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import { ZodError } from 'zod'

const CustomZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: ZodError) => {
    return new UnprocessableEntityException(
      error.errors.map((error) => {
        return {
          ...error,
          path: error.path.join('.'),
        }
      }),
    )
  },
})

export default CustomZodValidationPipe
