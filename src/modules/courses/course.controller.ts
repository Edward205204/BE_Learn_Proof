import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { CourseService } from './services/courses.service'
import {
  CreateCourseSt2Dto,
  GetCourseDetailQueryDTO,
  GetCoursesQueryDTO,
  GetSearchSuggestionsQueryDTO,
} from './courses.dto'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import {
  AllSlugsResponseSchema,
  CourseDetailResponseSchema,
  CreateCourseSt1Dto,
  CreateCourseSt1ResponseSchema,
  CreateCourseFullResponseSchema,
  CreateCourseSt3Dto,
  GetCategoriesResponseSchema,
  GetCoursesResponseSchema,
  GetSearchSuggestionsResponseSchema,
  HomeSectionsResponseSchema,
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

  @Get(':slug')
  @IsPublic()
  @ZodSerializerDto(CourseDetailResponseSchema)
  getCourseDetail(@Param() params: GetCourseDetailQueryDTO) {
    return this.courseService.getCourseDetail(params.slug)
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
  @ZodSerializerDto(CreateCourseSt1ResponseSchema)
  createCourseSt1(@Body() body: CreateCourseSt1Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.createCourseSt1(body, user.userId)
  }

  @Post('create-course/st2')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  createCourseSt2(@Body() body: CreateCourseSt2Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.createCourseSt2(body, user.userId)
  }

  @Post('create-course/st3')
  @ZodSerializerDto(CreateCourseFullResponseSchema)
  createCourseSt3(@Body() body: CreateCourseSt3Dto, @ActiveUser() user: TokenPayload) {
    return this.courseManagerService.createCourseSt3(body, user.userId)
  }
}
