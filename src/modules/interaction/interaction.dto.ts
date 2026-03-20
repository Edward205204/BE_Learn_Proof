import { createZodDto } from 'nestjs-zod'
import {
  PaginationSchema,
  IdParamSchema,
  LessonParamSchema,
  ChangePinSchema,
  CreateCommentSchema,
  UpdateCommentSchema,
  CreateReplySchema,
  UpdateReplySchema,
  GetCommentsResponseSchema,
  CommentItemSchema,
  ReplyItemSchema,
} from './interaction.model'

export class CreateCommentDto extends createZodDto(CreateCommentSchema) {}
export class UpdateCommentDto extends createZodDto(UpdateCommentSchema) {}
export class PaginationDto extends createZodDto(PaginationSchema) {}
export class IdParamDto extends createZodDto(IdParamSchema) {}
export class LessonParamDto extends createZodDto(LessonParamSchema) {}
export class ChangePinDto extends createZodDto(ChangePinSchema) {}
export class CreateReplyDto extends createZodDto(CreateReplySchema) {}
export class UpdateReplyDto extends createZodDto(UpdateReplySchema) {}

export class GetCommentsResponseDto extends createZodDto(GetCommentsResponseSchema) {}
export class CommentItemDto extends createZodDto(CommentItemSchema) {}
export class ReplyItemDto extends createZodDto(ReplyItemSchema) {}
