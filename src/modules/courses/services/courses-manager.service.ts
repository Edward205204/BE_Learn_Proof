import { Injectable } from '@nestjs/common'
import {
  CreateCourseSt1Dto,
  CreateCourseSt2Dto,
  CreateCourseSt3Dto,
  ReorderChapterDto,
  ReorderLessonDto,
} from '../courses.model'
import { CourseRepo } from '../courses.repo'
import { SlugService } from 'src/shared/services/slug.service'
import {
  CategoryNotFoundException,
  CourseNotMatchException,
  CourseNotDraftException,
  CourseNotFoundException,
} from '../error.model'
import { CourseStatus } from 'src/generated/prisma/enums'

@Injectable()
export class CoursesManagerService {
  constructor(
    private readonly courseRepo: CourseRepo,
    private readonly slugService: SlugService,
  ) {}

  async createCourseSt1(body: CreateCourseSt1Dto, creatorId: string) {
    const category = await this.courseRepo.findCategoryById(body.categoryId)
    if (!category) {
      throw new CategoryNotFoundException()
    }
    const slug = await this.slugService.generateUniqueSlug(body.title)
    return this.courseRepo.createCourseSt1(body, slug, creatorId)
  }

  // gắn liền với viẹc tạo chương
  async createCourseSt2(body: CreateCourseSt2Dto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: body.courseId })
    if (!course) {
      throw new CourseNotFoundException()
    }

    if (course.status !== CourseStatus.DRAFT) {
      throw new CourseNotDraftException()
    }

    const data = await this.courseRepo.syncChaptersFrame(body)
    return data
  }

  async createCourseSt3(body: CreateCourseSt3Dto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: body.courseId })
    if (!course) {
      throw new CourseNotFoundException()
    }

    if (course.status !== CourseStatus.DRAFT) {
      throw new CourseNotDraftException()
    }

    const data = await this.courseRepo.finishCreateCourse({ ...body, creatorId })
    return data
  }

  async reorderLesson(body: ReorderLessonDto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: body.courseId })
    if (!course) throw new CourseNotFoundException()
    const lesson = await this.courseRepo.findLessonUnique({ id: body.lessonId, creatorId })
    if (!lesson) throw new CourseNotMatchException()
    return this.courseRepo.updateOrderLesson(body)
  }

  async reorderChapters(body: ReorderChapterDto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: body.courseId })
    if (!course) throw new CourseNotFoundException()

    const chapter = await this.courseRepo.findChapterUnique({ id: body.chapterId, creatorId })
    if (!chapter) throw new CourseNotMatchException()
    return this.courseRepo.updateOrderChapters(body)
  }
}
