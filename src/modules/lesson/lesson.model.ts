import { z } from 'zod'
import { QuestionSchema } from '../quiz/quiz.model'

export const QuizTypeEnum = z.enum(['LESSON', 'CHAPTER'])
export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  QUIZ = 'QUIZ',
}

export enum LessonProvider {
  YOUTUBE = 'YOUTUBE',
  BUNNY = 'BUNNY',
  SELF_HOSTED = 'SELF_HOSTED',
}

export const LessonTypeEnum = z.enum(Object.values(LessonType) as [LessonType, ...LessonType[]])
export type LessonTypeEnumTS = z.infer<typeof LessonTypeEnum>

export const VideoProviderEnum = z.enum(['YOUTUBE', 'BUNNY', 'SELF_HOSTED'])

export type VideoProviderEnumTS = z.infer<typeof VideoProviderEnum>

export const UpdateLessonSchema = z
  .object({
    type: LessonTypeEnum,
    title: z.string().optional(),
    shortDesc: z.string().optional(),
    duration: z.number().optional(),
    textContent: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type !== LessonType.TEXT && data.textContent) {
      ctx.addIssue({
        code: 'custom',
        message: 'Chỉ bài học dạng TEXT mới được có textContent',
        path: ['textContent'],
      })
    }

    if (data.type === LessonType.TEXT && data.duration) {
      ctx.addIssue({
        code: 'custom',
        message: 'Loại TEXT không được có duration',
        path: ['duration'],
      })
    }
  })

export const CreateLessonSchema = z
  .object({
    type: LessonTypeEnum,
    title: z.string().min(1, 'Phải có tiêu đề bài học'),
    shortDesc: z.string().optional(),
    chapterId: z.string(),
    videoId: z.string().optional(),
    duration: z.coerce.number().optional(),
    textContent: z.string().optional(),
    quizData: z.array(QuestionSchema).min(1, 'Phải có ít nhất một câu hỏi').optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === LessonType.VIDEO) return !!data.videoId
      return true
    },
    { message: 'Loại VIDEO thì phải có videoId', path: ['videoId'] },
  )
  .refine(
    (data) => {
      if (data.type === LessonType.TEXT) return !!data.textContent
      return true
    },
    { message: 'Loại TEXT thì phải có textContent', path: ['textContent'] },
  )
  .refine(
    (data) => {
      if (data.type === LessonType.QUIZ) return !!data.quizData
      return true
    },
    { message: 'Loại QUIZ thì phải có quizData', path: ['quizData'] },
  )

export const ReorderLessonBodySchema = z
  .object({
    courseId: z.string(),
    targetChapterId: z.string(),
    prevLessonId: z.string().nullable(),
    nextLessonId: z.string().nullable(),
    lessonId: z.string(),
  })
  .strict()

export type CreateLessonBodyType = z.infer<typeof CreateLessonSchema>
export type UpdateLessonBodyType = z.infer<typeof UpdateLessonSchema>
export type ReorderLessonDto = z.infer<typeof ReorderLessonBodySchema>
