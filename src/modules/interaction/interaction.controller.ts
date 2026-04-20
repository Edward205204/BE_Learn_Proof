import { Controller, Get, Param, Query, Patch, Body, Post, Delete } from '@nestjs/common'
import { Role } from 'src/generated/prisma/enums'
import { ApiBearerAuth } from '@nestjs/swagger'
import { InteractionService } from './interaction.service'
import {
  PaginationDto,
  IdParamDto,
  LessonParamDto,
  ChangePinDto,
  CreateReviewDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateReplyDto,
  UpdateReplyDto,
  ReplyReviewDto,
} from './interaction.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  GetCommentsResponseSchema,
  GetAllCommentsResponseSchema,
  GetReviewsResponseSchema,
  ReviewItemSchema,
  CommentItemSchema,
  ReplyItemSchema,
} from './interaction.model'

@Controller()
@ApiBearerAuth('access-token')
export class InteractionController {
  constructor(private readonly service: InteractionService) {}

  // Lấy comment theo lesson
  @Get('courses/:courseId/lessons/:lessonId/comments')
  @ZodSerializerDto(GetCommentsResponseSchema)
  getLessonComments(@Param() param: LessonParamDto, @Query() query: PaginationDto) {
    return this.service.getLessonComments(param.courseId, param.lessonId, query.page, query.limit)
  }

  // Content Manager
  @Get('comments')
  @ZodSerializerDto(GetAllCommentsResponseSchema)
  getAllComments(@Query() query: PaginationDto, @ActiveUser() user: TokenPayload) {
    const creatorId = user.role === Role.CONTENT_MANAGER ? user.userId : undefined
    return this.service.getAllComments(query.page, query.limit, creatorId)
  }

  @Patch('comments/:id/pin')
  @ZodSerializerDto(CommentItemSchema)
  changePin(@Param() param: IdParamDto, @Body() body: ChangePinDto) {
    return this.service.changePin(param.id, body.isPinned)
  }
  @Post('courses/:courseId/lessons/:lessonId/comments')
  @ZodSerializerDto(CommentItemSchema)
  createComment(@Param() param: LessonParamDto, @Body() body: CreateCommentDto, @ActiveUser() user: TokenPayload) {
    return this.service.createComment(param.courseId, param.lessonId, body.content, user.userId, user.role)
  }
  @Patch('comments/:id')
  @ZodSerializerDto(CommentItemSchema)
  updateComment(@Param() param: IdParamDto, @Body() body: UpdateCommentDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateCommentContent(param.id, body.content, user.userId)
  }
  @Delete('comments/:id')
  @ZodSerializerDto(CommentItemSchema)
  deleteComment(@Param() param: IdParamDto, @ActiveUser() user: TokenPayload) {
    return this.service.deleteComment(param.id, user.userId, user.role)
  }
  @Post('comments/:id/replies')
  @ZodSerializerDto(ReplyItemSchema)
  createReply(@Param() param: IdParamDto, @Body() body: CreateReplyDto, @ActiveUser() user: TokenPayload) {
    return this.service.createReply(param.id, body.content, user.userId, user.role)
  }
  @Patch('replies/:id')
  @ZodSerializerDto(ReplyItemSchema)
  updateReply(@Param() param: IdParamDto, @Body() body: UpdateReplyDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateReply(param.id, body.content, user.userId)
  }
  @Delete('replies/:id')
  @ZodSerializerDto(ReplyItemSchema)
  deleteReply(@Param() param: IdParamDto, @ActiveUser() user: TokenPayload) {
    return this.service.deleteReply(param.id, user.userId, user.role)
  }

  //Review
  @Get('courses/:courseId/reviews')
  @ZodSerializerDto(GetReviewsResponseSchema)
  getCourseReviews(@Param('courseId') courseId: string, @Query() query: PaginationDto) {
    return this.service.getCourseReviews(courseId, query.page, query.limit)
  }

  @Post('courses/:courseId/reviews')
  @ZodSerializerDto(ReviewItemSchema)
  createReview(@Param('courseId') courseId: string, @Body() body: CreateReviewDto, @ActiveUser() user: TokenPayload) {
    return this.service.createReview(courseId, user.userId, body.rating, body.comment)
  }

  @Patch('courses/:courseId/reviews')
  @ZodSerializerDto(ReviewItemSchema)
  updateReview(@Param('courseId') courseId: string, @Body() body: CreateReviewDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateReview(courseId, user.userId, body.rating, body.comment)
  }

  @Delete('courses/:courseId/reviews')
  @ZodSerializerDto(ReviewItemSchema)
  deleteReview(@Param('courseId') courseId: string, @ActiveUser() user: TokenPayload) {
    return this.service.deleteReview(courseId, user.userId)
  }

  // CM / Admin management endpoints
  @Get('reviews')
  @ZodSerializerDto(GetReviewsResponseSchema)
  getAllReviews(@Query() query: PaginationDto, @ActiveUser() user: TokenPayload) {
    const creatorId = user.role === Role.CONTENT_MANAGER ? user.userId : undefined
    return this.service.getAllReviews(query.page, query.limit, creatorId)
  }

  @Post('reviews/:id/replies')
  @ZodSerializerDto(ReviewItemSchema)
  replyToReview(@Param('id') id: string, @Body() body: ReplyReviewDto, @ActiveUser() user: TokenPayload) {
    return this.service.replyToReview(id, body.content, user.userId)
  }

  @Delete('reviews/:id')
  @ZodSerializerDto(ReviewItemSchema)
  deleteReviewById(@Param('id') id: string, @ActiveUser() user: TokenPayload) {
    return this.service.deleteReviewById(id, user.userId, user.role)
  }
}
