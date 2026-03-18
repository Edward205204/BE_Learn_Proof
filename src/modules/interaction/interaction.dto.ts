import { createZodDto } from 'nestjs-zod'
import { PaginationSchema, IdParamSchema } from './interaction.model'

export class PaginationDto extends createZodDto(PaginationSchema) {}
export class IdParamDto extends createZodDto(IdParamSchema) {}