import { Controller, Get, Param, Query, Patch, Body } from '@nestjs/common'
import { InteractionService } from './interaction.service'
import { PaginationDto, IdParamDto, LessonParamDto, ChangePinDto } from './interaction.dto'
import { Post, Delete } from '@nestjs/common'
import { CreateCommentDto, UpdateCommentDto } from './interaction.dto'
import { CreateReplyDto, UpdateReplyDto } from '../interaction/interaction.dto'

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
  createComment(@Param() param: LessonParamDto, @Body() body: CreateCommentDto) {
    return this.service.createComment(param.courseId, param.lessonId, body.content)
  }
  @Patch('comments/:id')
  updateComment(@Param() param: IdParamDto, @Body() body: UpdateCommentDto) {
    return this.service.updateCommentContent(param.id, body.content)
  }
  @Delete('comments/:id')
  deleteComment(@Param() param: IdParamDto) {
    return this.service.deleteComment(param.id)
  }
  @Post('comments/:id/replies')
  createReply(@Param() param: IdParamDto, @Body() body: CreateReplyDto) {
    return this.service.createReply(param.id, body.content)
  }
  @Patch('replies/:id')
  updateReply(@Param() param: IdParamDto, @Body() body: UpdateReplyDto) {
    return this.service.updateReply(param.id, body.content)
  }
  @Delete('replies/:id')
  deleteReply(@Param() param: IdParamDto) {
    return this.service.deleteReply(param.id)
  }
}
