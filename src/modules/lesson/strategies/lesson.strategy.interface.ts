import { CreateLessonBodyType } from '../lesson.model'
import { CreateLessonResponseType, LessonDetailRaw, LessonDetailResponse } from '../lesson.response'

export interface LessonStrategy {
  create(data: CreateLessonBodyType): Promise<CreateLessonResponseType>
  get(lesson: LessonDetailRaw): Promise<LessonDetailResponse>
}
