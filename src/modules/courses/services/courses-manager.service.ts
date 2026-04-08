import { Injectable } from '@nestjs/common'
import {
  CreateCourseSt1Dto,
  CreateCourseSt2Dto,
  CreateCourseSt3Dto,
  GetMyCoursesManagerQueryType,
  ReorderChapterDto,
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

  async createCourse(body: CreateCourseSt1Dto, creatorId: string) {
    const category = await this.courseRepo.findCategoryUnique({ id: body.categoryId })
    if (!category) {
      throw new CategoryNotFoundException()
    }
    const slug = await this.slugService.generateUniqueSlug(body.title)
    return this.courseRepo.createCourseSt1(body, slug, creatorId)
  }

  // gắn liền với viẹc tạo chương
  async updateCourseChaptersFrame(courseId: string, body: CreateCourseSt2Dto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: courseId })
    if (!course) {
      throw new CourseNotFoundException()
    }

    if (course.status !== CourseStatus.DRAFT) {
      throw new CourseNotDraftException()
    }

    const data = await this.courseRepo.syncChaptersFrame(courseId, body)
    return data
  }

  async publishCourse(courseId: string, body: CreateCourseSt3Dto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: courseId })
    if (!course) {
      throw new CourseNotFoundException()
    }

    if (course.status !== CourseStatus.DRAFT) {
      throw new CourseNotDraftException()
    }

    const data = await this.courseRepo.finishCreateCourse(courseId, { ...body, creatorId })
    return data
  }

  async getCourseBaseInfo(courseId: string, creatorId: string) {
    const course = await this.courseRepo.getCourseUniqueIncludeChapters({ creatorId, id: courseId })
    if (!course) throw new CourseNotFoundException()
    return course
  }

  async getCourseDetailManager(courseId: string, creatorId: string) {
    const course = await this.courseRepo.getCourseDetailManager({ creatorId, id: courseId })
    if (!course) throw new CourseNotFoundException()
    return course
  }

  async updateCourseBaseInfo(courseId: string, body: CreateCourseSt1Dto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: courseId })
    if (!course) throw new CourseNotFoundException()

    if (course.status !== CourseStatus.DRAFT) {
      throw new CourseNotDraftException()
    }

    const category = await this.courseRepo.findCategoryUnique({ id: body.categoryId })
    if (!category) {
      throw new CategoryNotFoundException()
    }

    const slug = await this.slugService.generateUniqueSlug(body.title)
    return this.courseRepo.updateCourseBaseInfo(courseId, creatorId, body, slug)
  }

  private calculateNewOrder(prevOrder: number | null, nextOrder: number | null) {
    if (prevOrder !== null && nextOrder !== null) {
      return (prevOrder + nextOrder) / 2
    }
    if (prevOrder !== null) {
      return prevOrder + 100
    }
    if (nextOrder !== null) {
      return nextOrder / 2
    }
    return 1000
  }

  async reorderChapters(body: ReorderChapterDto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({ creatorId, id: body.courseId })
    if (!course) throw new CourseNotFoundException()

    const chapter = await this.courseRepo.findChapterUnique({ id: body.chapterId, creatorId })
    if (!chapter) throw new CourseNotMatchException()
    // return this.courseRepo.updateOrderChapters(body)
    const prevChapter = await this.courseRepo.findChapterOrder(body.prevChapterId)
    const nextChapter = await this.courseRepo.findChapterOrder(body.nextChapterId)
    const newOrder = this.calculateNewOrder(prevChapter?.order ?? null, nextChapter?.order ?? null)
    const data = await this.courseRepo.updateChapterOrder(body.chapterId, newOrder)
    return data
  }

  async getMyCoursesManager(query: GetMyCoursesManagerQueryType, userId: string) {
    const data = await this.courseRepo.getListCoursesManager(query, userId)
    return data
  }
}
