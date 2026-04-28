import { LessonType } from 'src/generated/prisma/enums'
import { z } from 'zod'

export const CreateLessonResponse = z.object({
  id: z.string(),
  title: z.string(),
  type: z.nativeEnum(LessonType),
  order: z.coerce.number(),
  chapterId: z.string(),
})

export type CreateLessonResponseType = z.infer<typeof CreateLessonResponse>

export type LessonDetailRaw = {
  id: string
  title: string
  shortDesc: string | null
  type: LessonType
  order: number
  videoId: string | null
  provider: string | null
  textContent: string | null
  duration: number | null
  chapterId: string
  videoKey: string | null
}

// --- Response types theo từng loại lesson ---

export type VideoLessonDetailResponse = {
  id: string
  title: string
  shortDesc: string | null
  type: 'VIDEO'
  order: number
  chapterId: string
  duration: number | null
  videoUrl: string
  videoKey: string | null
}

export type TextLessonDetailResponse = {
  id: string
  title: string
  shortDesc: string | null
  type: 'TEXT'
  order: number
  chapterId: string
  textContent: string
}

type QuizDetailData = {
  id: string
  lessonId: string
  questions: {
    id: string
    content: string
    isEdit: boolean
    answers: { id: string; content: string; isCorrect: boolean }[]
  }[]
} | null

export type QuizLessonDetailResponse = {
  id: string
  title: string
  shortDesc: string | null
  type: 'QUIZ'
  order: number
  chapterId: string
  quiz: QuizDetailData
}

export type LessonDetailResponse = VideoLessonDetailResponse | TextLessonDetailResponse | QuizLessonDetailResponse

// --- Learner view: quiz ẩn isCorrect, isEdit ---

type QuizLearnerData = {
  id: string
  lessonId: string
  questions: {
    id: string
    content: string
    answers: { id: string; content: string }[]
  }[]
} | null

export type QuizLessonLearnerResponse = {
  id: string
  title: string
  shortDesc: string | null
  type: 'QUIZ'
  order: number
  chapterId: string
  quiz: QuizLearnerData
}

export type LessonLearnerResponse = VideoLessonDetailResponse | TextLessonDetailResponse | QuizLessonLearnerResponse

export const LessonBasicResponseSchema = z.any()
export const LessonDetailResponseSchema = z.any()
export const LessonLearnerResponseSchema = z.any()
export const MarkLessonCompleteResponseSchema = z.any()
