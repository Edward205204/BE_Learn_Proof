import { z } from 'zod'


export const QuizTypeEnum = z.enum(['LESSON', 'CHAPTER'])


export const CreateQuizSchema = z.object({
  type: QuizTypeEnum,

  title: z.string().optional(),
  description: z.string().optional(),

  lessonId: z.string().optional(),
  chapterId: z.string().optional(),
})
.refine(
  (data) => {
    if (data.type === 'LESSON') return !!data.lessonId
    if (data.type === 'CHAPTER') return !!data.chapterId
    return false
  },
  {
    message: 'lessonId hoặc chapterId không hợp lệ với type',
  }
)

export const UpdateQuizSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
})


export const AnswerSchema = z.object({
  content: z.string(),
  isCorrect: z.boolean(),
})


export const AddQuestionSchema = z.object({
  quizId: z.string(),
  content: z.string(),

  answers: z
    .array(AnswerSchema)
    .min(2, 'Phải có ít nhất 2 đáp án')
    .refine(
      (answers) => answers.filter((a) => a.isCorrect).length === 1,
      'Phải có đúng 1 đáp án đúng'
    ),
})

export const UpdateQuestionSchema = z.object({
  content: z.string().optional(),
})


export const SubmitAnswerSchema = z.object({
  questionId: z.string(),
  answerId: z.string(),
})

export const SubmitQuizSchema = z.object({
  quizId: z.string(),
  answers: z.array(SubmitAnswerSchema),
})


export type CreateQuizBodyType = z.infer<typeof CreateQuizSchema>
export type UpdateQuizBodyType = z.infer<typeof UpdateQuizSchema>
export type AddQuestionBodyType = z.infer<typeof AddQuestionSchema>
export type SubmitQuizBodyType = z.infer<typeof SubmitQuizSchema>