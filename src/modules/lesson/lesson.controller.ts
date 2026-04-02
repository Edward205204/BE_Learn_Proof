import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger'
import { CreateLessonDto } from './lesson.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { LessonService } from './lesson.service'

@ApiTags('Lessons')
@ApiBearerAuth('access-token')
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo bài học mới trong một chương' })
  @ApiBody({ type: CreateLessonDto })
  @ApiResponse({ status: 201, description: 'Bài học tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chương hoặc khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  createLesson(@Body() body: CreateLessonDto, @ActiveUser() user: TokenPayload) {
    return this.lessonService.createLesson(body, user.userId)
  }
}
