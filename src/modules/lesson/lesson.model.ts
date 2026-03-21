import { z } from 'zod'
export const QuizTypeEnum = z.enum(['LESSON', 'CHAPTER'])
export const LessonTypeEnum = z.enum(['VIDEO', 'TEXT', 'QUIZ'])
export const VideoProviderEnum = z.enum(['YOUTUBE', 'BUNNY', 'SELF_HOSTED'])

export type LessonTypeEnumTS = z.infer<typeof LessonTypeEnum>
export type VideoProviderEnumTS = z.infer<typeof VideoProviderEnum>

const CreateQuizInsideLessonSchema = z.object({
  type: QuizTypeEnum,
  title: z.string().optional(),
  description: z.string().optional(),
  questions: z
    .array(
      z.object({
        content: z.string().min(1, 'Phải có nội dung câu hỏi'),
        answers: z
          .array(
            z.object({
              content: z.string().min(1, 'Phải có nội dung đáp án'),
              isCorrect: z.boolean(),
            }),
          )
          .min(2, 'Phải có ít nhất 2 đáp án'),
      }),
    )
    .min(1, 'Phải có ít nhất 1 câu hỏi'),
})

export const CreateLessonSchema = z
  .object({
    type: LessonTypeEnum,
    title: z.string().min(1, 'Phải có tiêu đề bài học'),
    shortDesc: z.string().optional(),
    fullDesc: z.string().optional(),
    chapterId: z.string(),
    videoId: z.string().optional(),
    provider: VideoProviderEnum.optional(),
    duration: z.coerce.number().optional(),
    textContent: z.string().optional(),
    quizData: CreateQuizInsideLessonSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'VIDEO') return !!data.videoId
      return true
    },
    { message: 'Loại VIDEO thì phải có videoId', path: ['videoId'] },
  )
  .refine(
    (data) => {
      if (data.type === 'TEXT') return !!data.textContent
      return true
    },
    { message: 'Loại TEXT thì phải có textContent', path: ['textContent'] },
  )
  .refine(
    (data) => {
      if (data.type === 'QUIZ') return !!data.quizData
      return true
    },
    { message: 'Loại QUIZ thì phải có quizData', path: ['quizData'] },
  )

export type CreateLessonBodyType = z.infer<typeof CreateLessonSchema>
