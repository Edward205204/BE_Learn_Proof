import { createZodDto } from 'nestjs-zod'
import { CreateLessonSchema, UpdateLessonSchema, ReorderLessonBodySchema } from './lesson.model'

export class CreateLessonDto extends createZodDto(CreateLessonSchema) {}

export class UpdateLessonDto extends createZodDto(UpdateLessonSchema) {}

export class ReorderLessonDto extends createZodDto(ReorderLessonBodySchema) {}
