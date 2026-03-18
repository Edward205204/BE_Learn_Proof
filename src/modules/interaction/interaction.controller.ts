import { Controller, Get, Param, Query, Patch, Body } from '@nestjs/common'
import { InteractionService } from './interaction.service'
import { PaginationDto, IdParamDto, LessonParamDto, ChangePinDto } from './interaction.dto'

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
}
