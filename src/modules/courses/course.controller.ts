import { Controller, Get, Param, Query } from '@nestjs/common'
import { CourseService } from './courses.service'
import { GetCourseDetailQueryDTO, GetCoursesQueryDTO, GetSearchSuggestionsQueryDTO } from './courses.dto'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import {
  AllSlugsResponseSchema,
  CourseDetailResponseSchema,
  GetCategoriesResponseSchema,
  GetCoursesResponseSchema,
  GetSearchSuggestionsResponseSchema,
  HomeSectionsResponseSchema,
} from './courses.model'
import { ZodSerializerDto } from 'nestjs-zod'

@Controller('courses')
export class CourseController {
  constructor(private readonly service: CourseService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(GetCoursesResponseSchema)
  getCourses(@Query() query: GetCoursesQueryDTO) {
    return this.service.getCourses(query)
  }

  @Get('home-sections')
  @IsPublic()
  @ZodSerializerDto(HomeSectionsResponseSchema)
  getHomeSections() {
    return this.service.getHomeSections()
  }

  @Get('search/suggestions')
  @IsPublic()
  @ZodSerializerDto(GetSearchSuggestionsResponseSchema)
  getSearchSuggestions(@Query() query: GetSearchSuggestionsQueryDTO) {
    return this.service.getSearchSuggestions(query)
  }

  @Get('all-slugs')
  @IsPublic()
  @ZodSerializerDto(AllSlugsResponseSchema)
  getAllSlugs() {
    return this.service.getAllSlugs()
  }

  @Get(':slug')
  @IsPublic()
  @ZodSerializerDto(CourseDetailResponseSchema)
  getCourseDetail(@Param() params: GetCourseDetailQueryDTO) {
    return this.service.getCourseDetail(params.slug)
  }

  @Get('categories')
  @IsPublic()
  @ZodSerializerDto(GetCategoriesResponseSchema)
  getCategories() {
    return this.service.getCategories()
  }
}
