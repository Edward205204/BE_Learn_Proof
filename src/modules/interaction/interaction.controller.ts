import { Controller, Get, Param, Query, Patch, Body, Post, Delete } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger'
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

@ApiTags('Interaction')
@Controller()
export class InteractionController {
  constructor(private readonly service: InteractionService) {}

  // ── Comments ──────────────────────────────────────────────────────────────

  @Get('courses/:courseId/lessons/:lessonId/comments')
  @ZodSerializerDto(GetCommentsResponseSchema)
  @ApiOperation({ summary: 'Lấy bình luận theo bài học' })
  @ApiParam({ name: 'courseId', description: 'ID của khoá học' })
  @ApiParam({ name: 'lessonId', description: 'ID của bài học' })
  @ApiResponse({ status: 200, description: 'Danh sách bình luận' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học hoặc bài học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getLessonComments(@Param() param: LessonParamDto, @Query() query: PaginationDto) {
    return this.service.getLessonComments(param.courseId, param.lessonId, query.page, query.limit)
  }

  @Get('comments')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(GetAllCommentsResponseSchema)
  @ApiOperation({ summary: 'Content Manager: Lấy tất cả bình luận' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả bình luận' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getAllComments(@Query() query: PaginationDto) {
    return this.service.getAllComments(query.page, query.limit)
  }

  @Patch('comments/:id/pin')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CommentItemSchema)
  @ApiOperation({ summary: 'Content Manager: Ghim / bỏ ghim bình luận' })
  @ApiParam({ name: 'id', description: 'ID bình luận' })
  @ApiBody({ type: ChangePinDto })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái ghim thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  changePin(@Param() param: IdParamDto, @Body() body: ChangePinDto) {
    return this.service.changePin(param.id, body.isPinned)
  }

  @Post('courses/:courseId/lessons/:lessonId/comments')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CommentItemSchema)
  @ApiOperation({ summary: 'Đăng bình luận trong bài học' })
  @ApiParam({ name: 'courseId', description: 'ID của khoá học' })
  @ApiParam({ name: 'lessonId', description: 'ID của bài học' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Đăng bình luận thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  createComment(@Param() param: LessonParamDto, @Body() body: CreateCommentDto, @ActiveUser() user: TokenPayload) {
    return this.service.createComment(param.courseId, param.lessonId, body.content, user.userId, user.role)
  }

  @Patch('comments/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CommentItemSchema)
  @ApiOperation({ summary: 'Chỉnh sửa nội dung bình luận' })
  @ApiParam({ name: 'id', description: 'ID bình luận' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: 'Cập nhật bình luận thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa bình luận này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  updateComment(@Param() param: IdParamDto, @Body() body: UpdateCommentDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateCommentContent(param.id, body.content, user.userId)
  }

  @Delete('comments/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CommentItemSchema)
  @ApiOperation({ summary: 'Xoá bình luận' })
  @ApiParam({ name: 'id', description: 'ID bình luận' })
  @ApiResponse({ status: 200, description: 'Xoá bình luận thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 403, description: 'Không có quyền xoá bình luận này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  deleteComment(@Param() param: IdParamDto, @ActiveUser() user: TokenPayload) {
    return this.service.deleteComment(param.id, user.userId)
  }

  // ── Replies ───────────────────────────────────────────────────────────────

  @Post('comments/:id/replies')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(ReplyItemSchema)
  @ApiOperation({ summary: 'Trả lời bình luận' })
  @ApiParam({ name: 'id', description: 'ID bình luận gốc' })
  @ApiBody({ type: CreateReplyDto })
  @ApiResponse({ status: 201, description: 'Đăng trả lời thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  createReply(@Param() param: IdParamDto, @Body() body: CreateReplyDto, @ActiveUser() user: TokenPayload) {
    return this.service.createReply(param.id, body.content, user.userId, user.role)
  }

  @Patch('replies/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(ReplyItemSchema)
  @ApiOperation({ summary: 'Chỉnh sửa nội dung trả lời' })
  @ApiParam({ name: 'id', description: 'ID trả lời' })
  @ApiBody({ type: UpdateReplyDto })
  @ApiResponse({ status: 200, description: 'Cập nhật trả lời thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa trả lời này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trả lời' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  updateReply(@Param() param: IdParamDto, @Body() body: UpdateReplyDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateReply(param.id, body.content, user.userId)
  }

  @Delete('replies/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(ReplyItemSchema)
  @ApiOperation({ summary: 'Xoá trả lời' })
  @ApiParam({ name: 'id', description: 'ID trả lời' })
  @ApiResponse({ status: 200, description: 'Xoá trả lời thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 403, description: 'Không có quyền xoá trả lời này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trả lời' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  deleteReply(@Param() param: IdParamDto, @ActiveUser() user: TokenPayload) {
    return this.service.deleteReply(param.id, user.userId)
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  @Get('courses/:courseId/reviews')
  @ZodSerializerDto(GetReviewsResponseSchema)
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của khoá học' })
  @ApiParam({ name: 'courseId', description: 'ID của khoá học' })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCourseReviews(@Param('courseId') courseId: string, @Query() query: PaginationDto) {
    return this.service.getCourseReviews(courseId, query.page, query.limit)
  }

  @Post('courses/:courseId/reviews')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(ReviewItemSchema)
  @ApiOperation({ summary: 'Đăng đánh giá khoá học' })
  @ApiParam({ name: 'courseId', description: 'ID của khoá học' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Đăng đánh giá thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  createReview(@Param('courseId') courseId: string, @Body() body: CreateReviewDto, @ActiveUser() user: TokenPayload) {
    return this.service.createReview(courseId, user.userId, body.rating, body.comment)
  }
}
