import { z } from 'zod'

export const QuizTypeEnum = z.enum(['LESSON', 'CHAPTER'])

export const AnswerSchema = z.object({
  content: z.string().min(1, 'Nội dung đáp án không được để trống'),
  isCorrect: z.boolean().default(false),
})

export const QuestionSchema = z.object({
  content: z.string().min(5, 'Câu hỏi quá ngắn'),
  answers: z
    .array(AnswerSchema)
    .min(2, 'Một câu hỏi phải có ít nhất 2 đáp án')
    .refine((items) => items.filter((item) => item.isCorrect).length === 1, {
      message: 'Một câu hỏi phải có đúng một đáp án đúng',
    }),
})

export const CreateQuizSchema = z.object({
  lessonId: z.string(),
  quizData: z.array(QuestionSchema).min(1, 'Phải có ít nhất một câu hỏi'),
})

export const SubmitQuizSchema = z
  .object({
    questionId: z.string(),
    answerId: z.string(),
  })
  .array()

export type SubmitQuizType = z.infer<typeof SubmitQuizSchema>

export type CreateQuizType = z.infer<typeof CreateQuizSchema>

export type QuestionType = z.infer<typeof QuestionSchema>
