import { createZodDto } from 'nestjs-zod'
import { CreateLessonSchema } from './lesson.model'

export class CreateLessonDto extends createZodDto(CreateLessonSchema) {}
