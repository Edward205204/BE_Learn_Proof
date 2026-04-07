import { CreateLessonBodyType } from '../lesson.model'
import { CreateLessonResponseType } from '../lesson.response'

export interface LessonStrategy {
  create(data: CreateLessonBodyType): Promise<CreateLessonResponseType>

  // update(lessonId: string, data: UpdateLessonDto): Promise<void>
}
