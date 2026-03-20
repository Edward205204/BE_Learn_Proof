import { Controller, Get, Param, Query, Patch, Body } from '@nestjs/common'
import { InteractionService } from './interaction.service'
import { PaginationDto, IdParamDto, LessonParamDto, ChangePinDto } from './interaction.dto'
import { Post, Delete } from '@nestjs/common'
import { CreateCommentDto, UpdateCommentDto } from './interaction.dto'
import { CreateReplyDto, UpdateReplyDto } from '../interaction/interaction.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Controller()
export class InteractionController {
  constructor(private readonly service: InteractionService) {}

  // Lấy comment theo lesson
  @Get('courses/:courseId/lessons/:lessonId/comments')
  getLessonComments(@Param() param: LessonParamDto, @Query() query: PaginationDto) {
    return this.service.getLessonComments(param.courseId, param.lessonId, query.page, query.limit)
  }

  // Content Manager
  @Get('comments')
  getAllComments(@Query() query: PaginationDto) {
    return this.service.getAllComments(query.page, query.limit)
  }

  @Patch('comments/:id/pin')
  changePin(@Param() param: IdParamDto, @Body() body: ChangePinDto) {
    return this.service.changePin(param.id, body.isPinned)
  }
  @Post('courses/:courseId/lessons/:lessonId/comments')
  createComment(@Param() param: LessonParamDto, @Body() body: CreateCommentDto, @ActiveUser() user: TokenPayload) {
    return this.service.createComment(param.courseId, param.lessonId, body.content, user.userId, user.role)
  }
  @Patch('comments/:id')
  updateComment(@Param() param: IdParamDto, @Body() body: UpdateCommentDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateCommentContent(param.id, body.content, user.userId)
  }
  @Delete('comments/:id')
  deleteComment(@Param() param: IdParamDto, @ActiveUser() user: TokenPayload) {
    return this.service.deleteComment(param.id, user.userId)
  }
  @Post('comments/:id/replies')
  createReply(@Param() param: IdParamDto, @Body() body: CreateReplyDto, @ActiveUser() user: TokenPayload) {
    return this.service.createReply(param.id, body.content, user.userId, user.role)
  }
  @Patch('replies/:id')
  updateReply(@Param() param: IdParamDto, @Body() body: UpdateReplyDto, @ActiveUser() user: TokenPayload) {
    return this.service.updateReply(param.id, body.content, user.userId)
  }
  @Delete('replies/:id')
  deleteReply(@Param() param: IdParamDto, @ActiveUser() user: TokenPayload) {
    return this.service.deleteReply(param.id, user.userId)
  }
}
