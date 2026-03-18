import { createZodDto } from 'nestjs-zod'
import {
  GetCoursesQuery,
  GetCourseDetailQuery,
  GetSearchSuggestionsQuery,
  CreateCourseSt1DtoSchema,
  CreateCourseSt2DtoSchema,
  CreateCourseSt3DtoSchema,
  ReorderLessonBodySchema,
  ReorderChapterBodySchema,
  GetMyCoursesManagerQuerySchema,
  GetCourseParamByIdSchema,
  UpdateCourseBaseInfoDtoSchema,
  QueryCourseDetailById,
} from './courses.model'

export class GetCoursesQueryDTO extends createZodDto(GetCoursesQuery) {}
export class GetCourseDetailQueryDTO extends createZodDto(GetCourseDetailQuery) {}

export class QueryCourseDetailByIdDTO extends createZodDto(QueryCourseDetailById) {}

export class GetSearchSuggestionsQueryDTO extends createZodDto(GetSearchSuggestionsQuery) {}
export class CreateCourseSt1Dto extends createZodDto(CreateCourseSt1DtoSchema) {}
export class CreateCourseSt2Dto extends createZodDto(CreateCourseSt2DtoSchema) {}
export class GetCourseParamByIdDTO extends createZodDto(GetCourseParamByIdSchema) {}
export class CreateCourseSt3Dto extends createZodDto(CreateCourseSt3DtoSchema) {}
export class UpdateCourseBaseInfoDto extends createZodDto(UpdateCourseBaseInfoDtoSchema) {}

export class ReorderLessonDto extends createZodDto(ReorderLessonBodySchema) {}
export class ReorderChapterDto extends createZodDto(ReorderChapterBodySchema) {}

export class GetMyCoursesManagerQueryDTO extends createZodDto(GetMyCoursesManagerQuerySchema) {}
