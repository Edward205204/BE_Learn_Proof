import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export const IdParamSchema = z.object({
  id: z.string().min(1),
})
export const LessonParamSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
})
export const ChangePinSchema = z.object({
  isPinned: z.boolean(),
})
// tạo comment
export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Content khong duoc rong'),
})

// update comment
export const UpdateCommentSchema = z.object({
  content: z.string().min(1),
})
// reply
export const CreateReplySchema = z.object({
  content: z.string().min(1, 'Reply khong duoc rong'),
})

export const UpdateReplySchema = z.object({
  content: z.string().min(1),
})
