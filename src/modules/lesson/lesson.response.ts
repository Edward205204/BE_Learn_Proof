import { LessonType } from 'src/generated/prisma/enums'
import { z } from 'zod'

export const CreateLessonResponse = z.object({
  id: z.string(),
  title: z.string(),
  type: LessonType,
  order: z.coerce.number(),
  chapterId: z.string(),
})

export type CreateLessonResponseType = z.infer<typeof CreateLessonResponse>
