import { createZodDto } from 'nestjs-zod'
import { CreateQuizSchema, UpdateQuizSchema, AddQuestionSchema, SubmitQuizSchema } from './quiz.model'

export class CreateQuizDto extends createZodDto(CreateQuizSchema) {}
export class UpdateQuizDto extends createZodDto(UpdateQuizSchema) {}
export class AddQuestionDto extends createZodDto(AddQuestionSchema) {}
export class SubmitQuizDto extends createZodDto(SubmitQuizSchema) {}
