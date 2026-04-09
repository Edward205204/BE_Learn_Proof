import { Body, Controller, Post, Param } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { CreateLessonDto } from './lesson.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { LessonService } from './lesson.service'

@Controller('lesson')
@ApiBearerAuth('access-token')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  createLesson(@Body() body: CreateLessonDto, @ActiveUser() user: TokenPayload) {
    return this.lessonService.createLesson(body, user.userId)
  }

  // POST /lesson/:lessonId/complete — learner đánh dấu đã học xong
  @Post(':lessonId/complete')
  markLessonComplete(
    @ActiveUser() user: TokenPayload,
    @Param('lessonId') lessonId: string,
    @Body('courseId') courseId: string,
  ) {
    return this.lessonService.markLessonComplete(user.userId, lessonId, courseId)
  }
}
