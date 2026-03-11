import { createZodDto } from 'nestjs-zod'
import {
  GetCoursesQuery,
  GetCourseDetailQuery,
  GetSearchSuggestionsQuery,
  CreateCourseSt1DtoSchema,
  CreateCourseSt2DtoSchema,
} from './courses.model'

export class GetCoursesQueryDTO extends createZodDto(GetCoursesQuery) {}
export class GetCourseDetailQueryDTO extends createZodDto(GetCourseDetailQuery) {}
export class GetSearchSuggestionsQueryDTO extends createZodDto(GetSearchSuggestionsQuery) {}
export class CreateCourseSt1Dto extends createZodDto(CreateCourseSt1DtoSchema) {}
export class CreateCourseSt2Dto extends createZodDto(CreateCourseSt2DtoSchema) {}
