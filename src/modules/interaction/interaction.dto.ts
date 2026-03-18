import { createZodDto } from 'nestjs-zod'
import {
  PaginationSchema,
  IdParamSchema,
  LessonParamSchema,
    ChangePinSchema,
} from './interaction.model'

export class PaginationDto extends createZodDto(PaginationSchema) {}
export class IdParamDto extends createZodDto(IdParamSchema) {}
export class LessonParamDto extends createZodDto(LessonParamSchema) {}
export class ChangePinDto extends createZodDto(ChangePinSchema) {}