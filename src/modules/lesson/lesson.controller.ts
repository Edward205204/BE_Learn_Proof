import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { CreateLessonDto, UpdateLessonDto, ReorderLessonDto } from './lesson.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { LessonService } from './lesson.service'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  LessonBasicResponseSchema,
  LessonDetailResponseSchema,
  LessonLearnerResponseSchema,
  MarkLessonCompleteResponseSchema,
} from './lesson.response'

@Controller('lesson')
@ApiBearerAuth('access-token')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // CMS

  @Post()
  @ZodSerializerDto(LessonBasicResponseSchema)
  createLesson(@Body() body: CreateLessonDto, @ActiveUser() user: TokenPayload) {
    return this.lessonService.createLesson(body, user.userId)
  }

  @Patch('reorder')
  @ZodSerializerDto(LessonBasicResponseSchema)
  reorderLesson(@Body() body: ReorderLessonDto) {
    return this.lessonService.reorderLesson(body)
  }

  @Get(':lessonId/learn')
  @ZodSerializerDto(LessonLearnerResponseSchema)
  getLessonForLearner(@Param('lessonId') lessonId: string, @ActiveUser() user: TokenPayload) {
    return this.lessonService.getLessonForLearner(lessonId, user.userId)
  }

  @Get(':lessonId')
  @ZodSerializerDto(LessonDetailResponseSchema)
  getLessonDetail(@Param('lessonId') lessonId: string) {
    return this.lessonService.getLessonDetail(lessonId)
  }

  @Patch(':lessonId/lock')
  @ZodSerializerDto(LessonBasicResponseSchema)
  toggleLessonLock(@Param('lessonId') lessonId: string, @Body('isLocked') isLocked: boolean) {
    return this.lessonService.toggleLessonLock(lessonId, isLocked)
  }

  @Patch(':lessonId')
  @ZodSerializerDto(LessonDetailResponseSchema)
  updateLesson(@Param('lessonId') lessonId: string, @Body() body: UpdateLessonDto) {
    return this.lessonService.updateLesson(lessonId, body)
  }

  @Delete(':lessonId')
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.lessonService.deleteLesson(lessonId)
  }

  @Post(':lessonId/complete')
  @ZodSerializerDto(MarkLessonCompleteResponseSchema)
  markLessonComplete(
    @ActiveUser() user: TokenPayload,
    @Param('lessonId') lessonId: string,
    @Body('courseId') courseId: string,
  ) {
    return this.lessonService.markLessonComplete(user.userId, lessonId, courseId)
  }

  @Post(':lessonId/ask')
  askLesson(@Param('lessonId') lessonId: string, @ActiveUser() user: TokenPayload, @Body('question') question: string) {
    return this.lessonService.askLesson(lessonId, user.userId, question)
  }
}
