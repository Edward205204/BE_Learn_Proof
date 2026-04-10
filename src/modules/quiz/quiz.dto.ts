import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { QuestionSchema, SubmitQuizSchema } from './quiz.model'

export class AddQuestionDto extends createZodDto(QuestionSchema) {}

export class AddAnswerDto extends createZodDto(z.object({ content: z.string().min(1) })) {}

export class EditContentDto extends createZodDto(z.object({ content: z.string().min(1) })) {}

export class ChooseCorrectAnswerDto extends createZodDto(z.object({ answerId: z.string() })) {}

export class SubmitQuizDto extends createZodDto(z.object({ submission: SubmitQuizSchema })) {}
