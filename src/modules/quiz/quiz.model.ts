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

export const AiQuizOptionSchema = z.string().min(1, 'Phương án không được để trống')

export const AiQuizQuestionSchema = z
  .object({
    question: z.string().min(10, 'Câu hỏi AI quá ngắn'),
    options: z.array(AiQuizOptionSchema).min(4, 'Mỗi câu hỏi phải có ít nhất 4 phương án'),
    correctIndex: z.number().int().min(0, 'correctIndex không hợp lệ'),
    explanation: z.string().min(1, 'Thiếu phần giải thích'),
  })
  .refine((question) => question.correctIndex < question.options.length, {
    message: 'correctIndex phải nằm trong phạm vi options',
    path: ['correctIndex'],
  })

export const AiQuizQuestionReviewStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED'])

export const AiQuizQuestionReviewSchema = AiQuizQuestionSchema.extend({
  reviewStatus: AiQuizQuestionReviewStatusSchema.optional(),
  quizQuestionId: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
})

export const AiQuizOutputSchema = z.object({
  questions: z.array(AiQuizQuestionReviewSchema).min(3, 'Quiz AI phải có ít nhất 3 câu hỏi'),
})

export type SubmitQuizType = z.infer<typeof SubmitQuizSchema>

export type CreateQuizType = z.infer<typeof CreateQuizSchema>

export type QuestionType = z.infer<typeof QuestionSchema>

export type AiQuizQuestionType = z.infer<typeof AiQuizQuestionSchema>

export type AiQuizQuestionReviewType = z.infer<typeof AiQuizQuestionReviewSchema>

export type AiQuizOutputType = z.infer<typeof AiQuizOutputSchema>
