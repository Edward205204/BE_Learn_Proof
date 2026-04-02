import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger'
import { CourseService } from './services/courses.service'
import {
  CreateCourseSt1Dto,
  CreateCourseSt2Dto,
  CreateCourseSt3Dto,
  GetCourseDetailQueryDTO,
  GetCourseParamByIdDTO,
  GetCoursesQueryDTO,
  GetMyCoursesManagerQueryDTO,
  GetSearchSuggestionsQueryDTO,
  QueryCourseDetailByIdDTO,
  UpdateCourseBaseInfoDto,
  ReorderLessonDto,
  ReorderChapterDto,
} from './courses.dto'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import {
  AllSlugsResponseSchema,
  CourseDetailResponseSchema,
  CreateCourseSt1ResponseSchema,
  CreateCourseFullResponseSchema,
  GetCategoriesResponseSchema,
  GetCoursesResponseSchema,
  GetSearchSuggestionsResponseSchema,
  HomeSectionsResponseSchema,
  GetCourseDetailManagerResponseSchema,
} from './courses.model'
import { ZodSerializerDto } from 'nestjs-zod'
import { CoursesManagerService } from './services/courses-manager.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly courseManagerService: CoursesManagerService,
  ) {}

  // ── Public Endpoints ──────────────────────────────────────────────────────

  @Get()
  @IsPublic()
  @ZodSerializerDto(GetCoursesResponseSchema)
  @ApiOperation({ summary: 'Lấy danh sách khoá học (có lọc, phân trang)' })
  @ApiResponse({ status: 200, description: 'Danh sách khoá học thành công' })
  @ApiResponse({ status: 400, description: 'Tham số query không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCourses(@Query() query: GetCoursesQueryDTO) {
    return this.courseService.getCourses(query)
  }

  @Get('home-sections')
  @IsPublic()
  @ZodSerializerDto(HomeSectionsResponseSchema)
  @ApiOperation({ summary: 'Lấy các section hiển thị trên trang chủ' })
  @ApiResponse({ status: 200, description: 'Dữ liệu các section trang chủ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getHomeSections() {
    return this.courseService.getHomeSections()
  }

  @Get('search/suggestions')
  @IsPublic()
  @ZodSerializerDto(GetSearchSuggestionsResponseSchema)
  @ApiOperation({ summary: 'Gợi ý tìm kiếm khoá học theo từ khoá' })
  @ApiResponse({ status: 200, description: 'Danh sách gợi ý tìm kiếm' })
  @ApiResponse({ status: 400, description: 'Tham số query không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getSearchSuggestions(@Query() query: GetSearchSuggestionsQueryDTO) {
    return this.courseService.getSearchSuggestions(query)
  }

  @Get('all-slugs')
  @IsPublic()
  @ZodSerializerDto(AllSlugsResponseSchema)
  @ApiOperation({ summary: 'Lấy tất cả slug khoá học (dùng cho SSG/ISR)' })
  @ApiResponse({ status: 200, description: 'Danh sách slug' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getAllSlugs() {
    return this.courseService.getAllSlugs()
  }

  @Get('categories')
  @IsPublic()
  @ZodSerializerDto(GetCategoriesResponseSchema)
  @ApiOperation({ summary: 'Lấy danh sách danh mục khoá học' })
  @ApiResponse({ status: 200, description: 'Danh sách danh mục' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCategories() {
    return this.courseService.getCategories()
  }

  // ── Protected – Instructor / Manager ──────────────────────────────────────

  @Post('create-course/st1')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseSt1ResponseSchema)
  @ApiOperation({ summary: 'Tạo khoá học – Bước 1 (thông tin cơ bản)' })
  @ApiBody({ type: CreateCourseSt1Dto })
  @ApiResponse({ status: 201, description: 'Khoá học bước 1 tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  createCourse(@Body() body: CreateCourseSt1Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.createCourse(body, user.userId)
  }

  @Patch(':id/chapters-frame')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  @ApiOperation({ summary: 'Cập nhật cấu trúc chương/bài – Bước 2' })
  @ApiParam({ name: 'id', description: 'ID của khoá học' })
  @ApiBody({ type: CreateCourseSt2Dto })
  @ApiResponse({ status: 200, description: 'Cập nhật cấu trúc thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  updateCourseChaptersFrame(
    @Param('id') id: string,
    @Body() body: CreateCourseSt2Dto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.updateCourseChaptersFrame(id, body, user.userId)
  }

  @Patch(':id/publish')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  @ApiOperation({ summary: 'Xuất bản khoá học – Bước 3 (giá, thumbnail, mô tả)' })
  @ApiParam({ name: 'id', description: 'ID của khoá học' })
  @ApiBody({ type: CreateCourseSt3Dto })
  @ApiResponse({ status: 200, description: 'Khoá học đã được xuất bản thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  publishCourse(@Param('id') id: string, @Body() body: CreateCourseSt3Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.publishCourse(id, body, user.userId)
  }

  @Patch('base-info/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  @ApiOperation({ summary: 'Cập nhật thông tin cơ bản của khoá học' })
  @ApiParam({ name: 'id', description: 'ID của khoá học' })
  @ApiBody({ type: UpdateCourseBaseInfoDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  updateCourseBaseInfo(
    @Param() param: GetCourseParamByIdDTO,
    @Body() body: UpdateCourseBaseInfoDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.updateCourseBaseInfo(param.id, body, user.userId)
  }

  @Patch('/reorder/lessons')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự bài học trong chương' })
  @ApiBody({ type: ReorderLessonDto })
  @ApiResponse({ status: 200, description: 'Sắp xếp bài học thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  async reorderLessons(@Body() body: ReorderLessonDto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.reorderLesson(body, user.userId)
  }

  @Patch('/reorder/chapters')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự chương trong khoá học' })
  @ApiBody({ type: ReorderChapterDto })
  @ApiResponse({ status: 200, description: 'Sắp xếp chương thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  async reorderChapters(@Body() body: ReorderChapterDto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.reorderChapters(body, user.userId)
  }

  @Get('manager/my-courses')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Instructor: Lấy danh sách khoá học của mình' })
  @ApiResponse({ status: 200, description: 'Danh sách khoá học của instructor' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getMyCoursesManager(@Query() query: GetMyCoursesManagerQueryDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getMyCoursesManager(query, user.userId)
  }

  @Get('manager/course-detail/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(GetCourseDetailManagerResponseSchema)
  @ApiOperation({ summary: 'Instructor: Lấy chi tiết khoá học để quản lý' })
  @ApiParam({ name: 'id', description: 'ID của khoá học' })
  @ApiResponse({ status: 200, description: 'Chi tiết khoá học (full data)' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCourseDetailManager(@Param() params: QueryCourseDetailByIdDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getCourseDetailManager(params.id, user.userId)
  }

  @Get('base-info/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  @ApiOperation({ summary: 'Instructor: Lấy thông tin cơ bản + chapters để chỉnh sửa' })
  @ApiParam({ name: 'id', description: 'ID của khoá học' })
  @ApiResponse({ status: 200, description: 'Thông tin cơ bản khoá học' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCourseBaseInfo(@Param() param: GetCourseParamByIdDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getCourseBaseInfo(param.id, user.userId)
  }

  @Get(':slug')
  @IsPublic()
  @ZodSerializerDto(CourseDetailResponseSchema)
  @ApiOperation({ summary: 'Lấy chi tiết khoá học theo slug (public)' })
  @ApiParam({ name: 'slug', description: 'Slug của khoá học' })
  @ApiResponse({ status: 200, description: 'Chi tiết khoá học' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCourseDetail(@Param() params: GetCourseDetailQueryDTO) {
    return this.courseService.getCourseDetail(params.slug)
  }
}
