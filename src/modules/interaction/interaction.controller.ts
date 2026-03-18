import { Controller, Get, Param, Query, Patch } from '@nestjs/common'
import { InteractionService } from './interaction.service'
import { PaginationDto, IdParamDto } from './interaction.dto'

@Controller()
export class InteractionController {
  constructor(private readonly service: InteractionService) {}

  // Lấy comment theo lesson
  @Get('courses/:courseId/lessons/:lessonId/comments')
  getLessonComments(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getLessonComments(
      courseId,
      lessonId,
      query.page,
      query.limit,
    )
  }

  // Content Manager
  @Get('comments')
  getAllComments(@Query() query: PaginationDto) {
    return this.service.getAllComments(query.page, query.limit)
  }

  // PIN
  @Patch('comments/:id/pin')
  pinComment(@Param() param: IdParamDto) {
    return this.service.pinComment(param.id)
  }

  // UNPIN
  @Patch('comments/:id/unpin')
  unpinComment(@Param() param: IdParamDto) {
    return this.service.unpinComment(param.id)
  }
}