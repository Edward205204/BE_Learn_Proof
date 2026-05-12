import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
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
  RenameChapterDto,
  UpdateCourseStatusDto,
} from './courses.dto'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { AuthType, ConditionGuard } from 'src/shared/constants/auth.constant'
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
  RenameChapterResponseSchema,
} from './courses.response'
import { ReorderChapterDto } from './courses.model'
import { ZodSerializerDto } from 'nestjs-zod'
import { CoursesManagerService } from './services/courses-manager.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly courseManagerService: CoursesManagerService,
  ) {}

  @Get()
  @Auth([AuthType.Bearer, AuthType.None], { condition: ConditionGuard.Or })
  @ZodSerializerDto(GetCoursesResponseSchema)
  getCourses(@Query() query: GetCoursesQueryDTO, @ActiveUser() user: TokenPayload) {
    return this.courseService.getCourses({ ...query, userId: user?.userId })
  }

  @Get('home-sections')
  @Auth([AuthType.Bearer, AuthType.None], { condition: ConditionGuard.Or })
  @ZodSerializerDto(HomeSectionsResponseSchema)
  getHomeSections(@ActiveUser() user: TokenPayload) {
    return this.courseService.getHomeSections(user?.userId)
  }

  @Get('search/suggestions')
  @IsPublic()
  @ZodSerializerDto(GetSearchSuggestionsResponseSchema)
  getSearchSuggestions(@Query() query: GetSearchSuggestionsQueryDTO) {
    return this.courseService.getSearchSuggestions(query)
  }

  @Get('all-slugs')
  @IsPublic()
  @ZodSerializerDto(AllSlugsResponseSchema)
  getAllSlugs() {
    return this.courseService.getAllSlugs()
  }

  @Get('categories')
  @IsPublic()
  @ZodSerializerDto(GetCategoriesResponseSchema)
  getCategories() {
    return this.courseService.getCategories()
  }

  // ---
  // phải implement logic check id trước khi thao tác

  @Post('create-course/st1')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseSt1ResponseSchema)
  createCourse(@Body() body: CreateCourseSt1Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.createCourse(body, user.userId)
  }

  @Patch(':id/chapters-frame')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
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
  publishCourse(@Param('id') id: string, @Body() body: CreateCourseSt3Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.publishCourse(id, body, user.userId)
  }

  @Patch(':courseId/complete')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  completeCourse(@Param('courseId') courseId: string, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.completeCourse(courseId, user.userId)
  }

  @Patch('base-info/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  updateCourseBaseInfo(
    @Param() param: GetCourseParamByIdDTO,
    @Body() body: UpdateCourseBaseInfoDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.updateCourseBaseInfo(param.id, body, user.userId)
  }

  @Patch('/reorder/chapters')
  @ApiBearerAuth('access-token')
  async reorderChapters(@Body() body: ReorderChapterDto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.reorderChapters(body, user.userId)
  }

  @Patch('chapters/:chapterId')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(RenameChapterResponseSchema)
  renameChapter(
    @Param('chapterId') chapterId: string,
    @Body() body: RenameChapterDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.renameChapter(chapterId, body.title, user.userId)
  }

  @Get('manager/dashboard')
  @ApiBearerAuth('access-token')
  getInstructorDashboard(@ActiveUser() user: TokenPayload, @Query('range') range?: string) {
    return this.courseManagerService.getInstructorDashboard(user.userId, range)
  }

  @Get('manager/my-courses')
  @ApiBearerAuth('access-token')
  // @ZodSerializerDto(GetSearchSuggestionsResponseSchema)
  getMyCoursesManager(@Query() query: GetMyCoursesManagerQueryDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getMyCoursesManager(query, user.userId)
  }

  @Get('manager/course-detail/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(GetCourseDetailManagerResponseSchema)
  getCourseDetailManager(@Param() params: QueryCourseDetailByIdDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getCourseDetailManager(params.id, user.userId)
  }

  @Get(':courseId/progress')
  @ApiBearerAuth('access-token')
  getCourseProgress(@Param('courseId') courseId: string, @ActiveUser() user: TokenPayload) {
    return this.courseService.getCourseProgress(user.userId, courseId)
  }

  @Get(':slug')
  @Auth([AuthType.Bearer, AuthType.None], { condition: ConditionGuard.Or })
  @ZodSerializerDto(CourseDetailResponseSchema)
  getCourseDetail(@Param() params: GetCourseDetailQueryDTO, @ActiveUser() user: TokenPayload) {
    return this.courseService.getCourseDetail(params.slug, user?.userId)
  }

  // lấy data cơ bản của khóa học và chapters để edit
  @Get('base-info/:id')
  @ApiBearerAuth('access-token')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  getCourseBaseInfo(@Param() param: GetCourseParamByIdDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getCourseBaseInfo(param.id, user.userId)
  }
  @Patch(':courseId/status')
  @ApiBearerAuth('access-token')
  updateCourseStatus(
    @Param('courseId') courseId: string,
    @Body() body: UpdateCourseStatusDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.updateCourseStatus(courseId, body, user.userId)
  }

  @Delete(':courseId/delete/chapter/:chapterId')
  @ApiBearerAuth('access-token')
  deleteChapter(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.deleteChapter({
      userId: user.userId,
      coursesId: courseId,
      chapterId: chapterId,
    })
  }

  @Delete(':courseId')
  @ApiBearerAuth('access-token')
  deleteCourse(@Param('courseId') courseId: string, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.deleteCourse(courseId, user.userId)
  }
}
