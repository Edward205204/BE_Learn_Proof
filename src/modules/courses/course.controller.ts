import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
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
  UpdateCourseBaseInfoDto,
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
  ReorderLessonDto,
  ReorderChapterDto,
} from './courses.model'
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
  @IsPublic()
  @ZodSerializerDto(GetCoursesResponseSchema)
  getCourses(@Query() query: GetCoursesQueryDTO) {
    return this.courseService.getCourses(query)
  }

  @Get('home-sections')
  @IsPublic()
  @ZodSerializerDto(HomeSectionsResponseSchema)
  getHomeSections() {
    return this.courseService.getHomeSections()
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

  @Get(':slug')
  @IsPublic()
  @ZodSerializerDto(CourseDetailResponseSchema)
  getCourseDetail(@Param() params: GetCourseDetailQueryDTO) {
    return this.courseService.getCourseDetail(params.slug)
  }

  // ---
  // phải implement logic check id trước khi thao tác

  @Post('create-course/st1')
  @ZodSerializerDto(CreateCourseSt1ResponseSchema)
  createCourse(@Body() body: CreateCourseSt1Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.createCourse(body, user.userId)
  }

  @Patch(':id/chapters-frame')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  updateCourseChaptersFrame(
    @Param('id') id: string,
    @Body() body: CreateCourseSt2Dto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.updateCourseChaptersFrame(id, body, user.userId)
  }

  @Patch(':id/publish')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  publishCourse(@Param('id') id: string, @Body() body: CreateCourseSt3Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.publishCourse(id, body, user.userId)
  }
  // lấy data cơ bản của khóa học và chapters để edit
  @Get('base-info/:id')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  getCourseBaseInfo(@Param() param: GetCourseParamByIdDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getCourseBaseInfo(param.id, user.userId)
  }

  @Patch('base-info/:id')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  updateCourseBaseInfo(
    @Param() param: GetCourseParamByIdDTO,
    @Body() body: UpdateCourseBaseInfoDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.courseManagerService.updateCourseBaseInfo(param.id, body, user.userId)
  }

  @Patch('/reorder/lessons')
  async reorderLessons(@Body() body: ReorderLessonDto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.reorderLesson(body, user.userId)
  }

  @Patch('/reorder/chapters')
  async reorderChapters(@Body() body: ReorderChapterDto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.reorderChapters(body, user.userId)
  }

  @Get('manager/my-courses')
  // @ZodSerializerDto(GetSearchSuggestionsResponseSchema)
  getMyCoursesManager(@Query() query: GetMyCoursesManagerQueryDTO, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.getMyCoursesManager(query, user.userId)
  }
}
