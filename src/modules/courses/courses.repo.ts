import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import {
  CreateCourseSt1Dto,
  CreateCourseSt2Dto,
  CreateCourseSt3Dto,
  GetCoursesQuery,
  GetMyCoursesManagerQueryType,
  ReorderChapterDto,
  ReorderLessonDto,
} from './courses.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CourseStatus, Prisma } from 'src/generated/prisma/client'

@Injectable()
export class CourseRepo {
  constructor(private prisma: PrismaService) {}

  findCategoryUnique(body: { id: string } | { slug: string }) {
    return this.prisma.category.findUnique({
      where: body,
      select: { id: true, name: true, slug: true },
    })
  }

  createCourseSt1(dto: CreateCourseSt1Dto, slug: string, creatorId: string) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        categoryId: dto.categoryId,

        level: dto.level,
        shortDesc: dto.shortDesc,
        fullDesc: dto.fullDesc,
        thumbnail: dto.thumbnail ?? null,
        // expectedDays: dto.expectedDays ?? null,
        expectedDays: null,
        isFree: true,
        price: 0,
        status: 'DRAFT',
        creatorId,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        categoryId: true,

        level: true,
        shortDesc: true,
        fullDesc: true,
        thumbnail: true,
        expectedDays: true,
        status: true,
        isFree: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
  }

  async syncChaptersFrame(courseId: string, dto: CreateCourseSt2Dto) {
    return await this.prisma.course.update({
      where: { id: courseId },
      data: {
        chapters: {
          createMany: {
            data: dto.chapterList,
          },
        },
      },
      include: {
        chapters: {
          orderBy: { order: 'asc' }, // Lấy ra luôn danh sách đã sắp xếp
        },
      },
    })
  }

  // ----- Public catalog -----

  async getCoursesCatalog(query: z.infer<typeof GetCoursesQuery>) {
    const { page, limit, category, level, price, rating, search, sort } = query

    // 1. Tính toán Pagination
    const skip = (page - 1) * limit

    // 2. Multi-level Sorting — mỗi option có tie-breaker để đảm bảo thứ tự ổn định
    const sortMapping: Record<string, Prisma.CourseOrderByWithRelationInput[]> = {
      // popular: tổng học viên ↓, nếu bằng → mới nhất lên trước
      popular: [{ overallAnalytics: { totalStudents: 'desc' } }, { createdAt: 'desc' }],
      // rating: điểm trung bình ↓, nếu bằng → nhiều học viên hơn lên trước
      rating: [{ overallAnalytics: { avgRating: 'desc' } }, { overallAnalytics: { totalStudents: 'desc' } }],
      // newest: chỉ cần 1 tầng
      newest: [{ createdAt: 'desc' }],
      // price-asc/desc: nếu bằng giá → rating cao hơn lên trước
      'price-asc': [{ price: 'asc' }, { overallAnalytics: { avgRating: 'desc' } }],
      'price-desc': [{ price: 'desc' }, { overallAnalytics: { avgRating: 'desc' } }],
    }

    // 3. Xây dựng bộ lọc (Where Clause)
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      ...(category && { category: { slug: category } }),
      ...(level && { level }),
      // price: 'true' → isFree: true | price: 'false' → isFree: false
      ...(price !== undefined && { isFree: price === 'true' }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
      ...(rating && {
        overallAnalytics: { avgRating: { gte: rating } },
      }),
    }

    // 4. Transaction — lấy đồng thời items và total count
    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortMapping[sort ?? 'newest'],
        // Chỉ select field cần thiết cho Product Card
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          price: true,
          originalPrice: true,
          level: true,
          category: { select: { name: true, slug: true } },
          creator: { select: { fullName: true, avatar: true } },
          overallAnalytics: { select: { avgRating: true, totalStudents: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ])

    return {
      items: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getCourseDetail(slug: string) {
    return this.prisma.course.findUnique({
      where: {
        slug,
        status: CourseStatus.PUBLISHED,
      },
      select: {
        // --- Core fields ---
        id: true,
        title: true,
        slug: true,
        shortDesc: true,
        fullDesc: true,
        thumbnail: true,

        level: true,
        status: true,
        isFree: true,
        price: true,
        originalPrice: true,
        isCompleted: true,
        publishedLessonsCount: true,
        totalPlannedLessons: true,
        expectedDays: true,
        createdAt: true,
        updatedAt: true,
        // --- Instructor ---
        creator: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
          },
        },
        // --- Category ---
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        // --- Curriculum (KHÔNG lấy videoUrl / textContent / contentAI) ---
        chapters: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                type: true,
                duration: true,
              },
            },
          },
        },
        // --- Analytics ---
        overallAnalytics: {
          select: {
            totalStudents: true,
            avgRating: true,
            completionRate: true,
          },
        },
        // --- Social Proof: 5 reviews mới nhất ---
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                fullName: true,
                avatar: true,
              },
            },
          },
        },
      },
    })
  }
  async getHomeSections() {
    // Chạy 4 query song song để tối ưu latency

    const baseSelect = {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      price: true,
      originalPrice: true,
      isFree: true,
      level: true,
      shortDesc: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
      creator: { select: { fullName: true, avatar: true } },
      overallAnalytics: {
        select: { avgRating: true, totalStudents: true, avgInterestScore: true },
      },
    } as const

    const [trending, topSelling, newest, topRated] = await Promise.all([
      // Top 5 — Interest Score cao nhất (Vận tốc học)
      this.prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { overallAnalytics: { avgInterestScore: 'desc' } },
        take: 5,
        select: baseSelect,
      }),
      // Top 10 — Nhiều học viên nhất
      this.prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { overallAnalytics: { totalStudents: 'desc' } },
        take: 10,
        select: baseSelect,
      }),
      // 5 — Mới nhất
      this.prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),
      // Top 5 — Rating cao nhất
      this.prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { overallAnalytics: { avgRating: 'desc' } },
        take: 5,
        select: baseSelect,
      }),
    ])

    return { trending, topSelling, newest, topRated }
  }

  getCategories() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            courses: { where: { status: 'PUBLISHED' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  getSearchSuggestions(q: string) {
    return this.prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        title: { contains: q, mode: 'insensitive' },
      },
      take: 5,
      select: {
        title: true,
        slug: true,
        thumbnail: true,
      },
      orderBy: { overallAnalytics: { totalStudents: 'desc' } },
    })
  }

  getAllSlugs() {
    return this.prisma.course
      .findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => rows.map((r) => r.slug))
  }

  getCourseUnique(body: { id: string } | { slug: string } | { creatorId: string; id: string }) {
    return this.prisma.course.findUnique({
      where: body,
    })
  }

  getCourseUniqueIncludeChapters(body: { id: string } | { slug: string } | { creatorId: string; id: string }) {
    return this.prisma.course.findUnique({
      where: body,
      include: {
        chapters: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  updateCourseBaseInfo(courseId: string, creatorId: string, dto: CreateCourseSt1Dto, slug?: string) {
    return this.prisma.course.update({
      where: {
        id_creatorId: {
          id: courseId,
          creatorId,
        },
      },
      data: {
        title: dto.title,
        ...(slug ? { slug } : {}),
        categoryId: dto.categoryId,
        level: dto.level,
        shortDesc: dto.shortDesc,
        fullDesc: dto.fullDesc,
        thumbnail: dto.thumbnail ?? null,
      },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
        },
      },
    })
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

  finishCreateCourse(courseId: string, payload: CreateCourseSt3Dto & { creatorId: string }) {
    return this.prisma.course.update({
      where: {
        id_creatorId: {
          id: courseId,
          creatorId: payload.creatorId,
        },
      },
      data: {
        status: 'PUBLISHED',
        isFree: payload.isFree,
        price: payload.price,
        originalPrice: payload.originalPrice,
      },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  updateOrderLesson(payload: ReorderLessonDto) {
    return this.prisma.$transaction(async (tx) => {
      const prevLesson = payload.prevLessonId
        ? await tx.lesson.findUnique({ where: { id: payload.prevLessonId }, select: { order: true } })
        : null

      const nextLesson = payload.nextLessonId
        ? await tx.lesson.findUnique({ where: { id: payload.nextLessonId }, select: { order: true } })
        : null

      const newOrder = this.calculateNewOrder(prevLesson?.order ?? null, nextLesson?.order ?? null)

      return await tx.lesson.update({
        where: { id: payload.lessonId },
        data: {
          order: newOrder,
          chapterId: payload.targetChapterId,
        },
      })
    })
  }

  updateOrderChapters(payload: ReorderChapterDto) {
    return this.prisma.$transaction(async (tx) => {
      const prevChapter = payload.prevChapterId
        ? await tx.chapter.findUnique({ where: { id: payload.prevChapterId }, select: { order: true } })
        : null

      const nextChapter = payload.nextChapterId
        ? await tx.chapter.findUnique({ where: { id: payload.nextChapterId }, select: { order: true } })
        : null

      const newOrder = this.calculateNewOrder(prevChapter?.order ?? null, nextChapter?.order ?? null)

      return await tx.chapter.update({
        where: { id: payload.chapterId },
        data: {
          order: newOrder,
        },
      })
    })
  }

  findLessonUnique(payload: { id: string; creatorId: string }) {
    return this.prisma.lesson.findFirst({
      where: {
        id: payload.id,
        chapter: { course: { creatorId: payload.creatorId } },
      },
    })
  }

  findChapterUnique(payload: { id: string; creatorId: string }) {
    return this.prisma.chapter.findFirst({
      where: {
        id: payload.id,
        course: { creatorId: payload.creatorId },
      },
    })
  }

  async getListCoursesManager(query: GetMyCoursesManagerQueryType, userId: string) {
    const { page, limit, status } = query

    const where = status === 'ALL' ? { creatorId: userId } : { status, creatorId: userId }

    // 1. Tính toán Pagination
    const skip = (page - 1) * limit
    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          isCompleted: true,
          thumbnail: true,
          price: true,
          originalPrice: true,
          isFree: true,
          level: true,
          shortDesc: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          overallAnalytics: { select: { avgRating: true, totalStudents: true, avgInterestScore: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ])
    return {
      items: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
