import { createZodDto } from 'nestjs-zod'
import { GetCoursesQuery, GetCourseDetailQuery, GetSearchSuggestionsQuery } from './courses.model'

export class GetCoursesQueryDTO extends createZodDto(GetCoursesQuery) {}
export class GetCourseDetailQueryDTO extends createZodDto(GetCourseDetailQuery) {}
export class GetSearchSuggestionsQueryDTO extends createZodDto(GetSearchSuggestionsQuery) {}
