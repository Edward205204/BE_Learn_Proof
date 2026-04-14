import { BadRequestException, Injectable } from '@nestjs/common'
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
import { UpdateCourseStatusDto } from '../courses.dto'

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

  async renameChapter(chapterId: string, title: string, creatorId: string) {
    const chapter = await this.courseRepo.findChapterUnique({ id: chapterId, creatorId })
    if (!chapter) throw new CourseNotMatchException()
    return this.courseRepo.renameChapter(chapterId, title)
  }

  async updateCourseStatus(courseId: string, body: UpdateCourseStatusDto, creatorId: string) {
    const course = await this.courseRepo.getCourseUnique({
      id: courseId,
      creatorId,
    })

    if (!course) throw new CourseNotFoundException()

    // TODO
    const enrollCount = await this.courseRepo.countEnrollmentsByCourse(courseId)

    const currentStatus = course.status
    const nextStatus = body.status

    // ❌ DRAFT → ARCHIVED
    if (currentStatus === CourseStatus.DRAFT && nextStatus === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Không thể chuyển từ DRAFT sang ARCHIVED')
    }

    // ❌ ARCHIVED → DRAFT
    if (currentStatus === CourseStatus.ARCHIVED && nextStatus === CourseStatus.DRAFT) {
      throw new BadRequestException('Không thể chuyển từ ARCHIVED về DRAFT')
    }

    // ❌ nếu đã có enroll → không được về DRAFT
    if (nextStatus === CourseStatus.DRAFT && enrollCount > 0) {
      throw new BadRequestException('Khóa học đã có người đăng ký, không thể chuyển về DRAFT')
    }

    // 🚨 RULE QUAN TRỌNG: phải có ít nhất 3 khóa published trước đó
    if (currentStatus === CourseStatus.DRAFT && nextStatus === CourseStatus.PUBLISHED) {
      const publishedCount = await this.courseRepo.countPublishedCoursesByCreator(creatorId)

      if (publishedCount < 3) {
        throw new BadRequestException('Bạn cần publish ít nhất 3 khóa học trước đó để mở khóa tính năng này')
      }
    }

    return this.courseRepo.updateCourseStatus(courseId, nextStatus)
  }
}
