import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { CreateLessonDto, UpdateLessonDto, ReorderLessonDto } from './lesson.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { LessonService } from './lesson.service'

@Controller('lesson')
@ApiBearerAuth('access-token')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // CMS

  @Post()
  createLesson(@Body() body: CreateLessonDto) {
    return this.lessonService.createLesson(body)
  }

  @Patch('reorder')
  reorderLesson(@Body() body: ReorderLessonDto) {
    return this.lessonService.reorderLesson(body)
  }

  @Get(':lessonId')
  getLessonDetail(@Param('lessonId') lessonId: string) {
    return this.lessonService.getLessonDetail(lessonId)
  }

  @Patch(':lessonId')
  updateLesson(@Param('lessonId') lessonId: string, @Body() body: UpdateLessonDto) {
    return this.lessonService.updateLesson(lessonId, body)
  }

  @Delete(':lessonId')
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.lessonService.deleteLesson(lessonId)
  }

  // Learner

  @Get(':lessonId/learn')
  getLessonForLearner(@Param('lessonId') lessonId: string) {
    return this.lessonService.getLessonForLearner(lessonId)
  }

  @Post(':lessonId/complete')
  markLessonComplete(
    @ActiveUser() user: TokenPayload,
    @Param('lessonId') lessonId: string,
    @Body('courseId') courseId: string,
  ) {
    return this.lessonService.markLessonComplete(user.userId, lessonId, courseId)
  }
}
