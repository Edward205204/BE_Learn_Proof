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

export const UserInteractionSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  avatar: z.string().nullable(),
})

export const ReplyItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  discussionId: z.string(),
  userId: z.string(),
  isDeleted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: UserInteractionSchema.optional(),
})

export const CommentItemSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  courseId: z.string(),
  userId: z.string(),
  content: z.string(),
  isPinned: z.boolean(),
  isDeleted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: UserInteractionSchema.optional(),
  replies: z.array(ReplyItemSchema).optional(),
})

export const GetCommentsResponseSchema = z.object({
  data: z.array(CommentItemSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const CommentWithLessonItemSchema = CommentItemSchema.extend({
  lesson: z
    .object({
      id: z.string(),
      title: z.string(),
      chapter: z.object({
        course: z.object({
          id: z.string(),
          title: z.string(),
        }),
      }),
    })
    .optional(),
})

export const GetAllCommentsResponseSchema = z.object({
  data: z.array(CommentWithLessonItemSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const ReviewItemSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  userId: z.string(),
  courseId: z.string(),
  createdAt: z.date(),
  user: UserInteractionSchema.optional(),
  course: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .optional(),
})

export const GetReviewsResponseSchema = z.object({
  data: z.array(ReviewItemSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

export type ReviewItem = z.infer<typeof ReviewItemSchema>
export type GetReviewsResponse = z.infer<typeof GetReviewsResponseSchema>
export type ReplyItem = z.infer<typeof ReplyItemSchema>
export type CommentItem = z.infer<typeof CommentItemSchema>
export type CommentWithLessonItem = z.infer<typeof CommentWithLessonItemSchema>
export type GetCommentsResponse = z.infer<typeof GetCommentsResponseSchema>
export type GetAllCommentsResponse = z.infer<typeof GetAllCommentsResponseSchema>
