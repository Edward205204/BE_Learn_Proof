import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { z } from 'zod'
import {
  CreateCourseSt1Dto,
  CreateCourseSt2Dto,
  CreateCourseSt3Dto,
  GetCoursesQuery,
  GetMyCoursesManagerQueryType,
} from './courses.model'
import { CourseStatus, Prisma, PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class CourseRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  findCategoryUnique(body: { id: string } | { slug: string }) {
    return this.txHost.tx.category.findUnique({
      where: body,
      select: { id: true, name: true, slug: true },
    })
  }

  createCourseSt1(dto: CreateCourseSt1Dto, slug: string, creatorId: string) {
    return this.txHost.tx.course.create({
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
    return await this.txHost.tx.course.update({
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
          orderBy: [{ order: 'asc' }, { id: 'asc' }], // Lấy ra luôn danh sách đã sắp xếp
        },
      },
    })
  }

  // ----- Public catalog -----

  async getCoursesCatalog(query: z.infer<typeof GetCoursesQuery>, userId?: string) {
    const { page, limit, category, level, price, search, sort } = query
    const skip = (page - 1) * limit
    const sortMapping: Record<string, Prisma.CourseOrderByWithRelationInput[]> = {
      popular: [{ createdAt: 'desc' }],
      rating: [{ createdAt: 'desc' }],
      newest: [{ createdAt: 'desc' }],
      'price-asc': [{ price: 'asc' }, { createdAt: 'desc' }],
      'price-desc': [{ price: 'desc' }, { createdAt: 'desc' }],
    }

    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      ...(category && { category: { slug: category } }),
      ...(level && { level }),
      ...(price !== undefined && { isFree: price === 'true' }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
    }

    const [courses, total, userEnrollments] = await Promise.all([
      this.txHost.tx.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortMapping[sort ?? 'newest'],
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
        },
      }),
      this.txHost.tx.course.count({ where }),
      userId
        ? this.txHost.tx.enrollment.findMany({
            where: { userId, course: where },
            select: { courseId: true },
          })
        : Promise.resolve([]),
    ])

    const enrolledIds = new Set(userEnrollments.map((e) => e.courseId))

    const items = await Promise.all(
      courses.map(async (c) => {
        const [avgRatingRes, totalStudents] = await Promise.all([
          this.txHost.tx.review.aggregate({
            where: { courseId: c.id },
            _avg: { rating: true },
          }),
          this.txHost.tx.enrollment.count({
            where: { courseId: c.id },
          }),
        ])

        return {
          ...c,
          isEnrolled: enrolledIds.has(c.id),
          overallAnalytics: {
            avgRating: avgRatingRes._avg.rating || 0,
            totalStudents,
          },
        }
      }),
    )

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getCourseDetail(slug: string, userId?: string) {
    const course = await this.txHost.tx.course.findUnique({
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
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: [{ order: 'asc' }, { id: 'asc' }],
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
        // --- Social Proof: 5 reviews mới nhất ---
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            instructorReply: true,
            instructorReplyAt: true,
            learnerReply: true,
            learnerReplyAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
        // --- Check Enrollment ---
        ...(userId && {
          enrollments: {
            where: { userId },
            select: { id: true },
            take: 1,
          },
        }),
      },
    })

    if (!course) return null

    // --- Tính toán analytics thực tế ---
    const [avgRatingRes, totalStudents, userReview] = await Promise.all([
      this.txHost.tx.review.aggregate({
        where: { courseId: course.id },
        _avg: { rating: true },
      }),
      this.txHost.tx.enrollment.count({
        where: { courseId: course.id },
      }),
      userId
        ? this.txHost.tx.review.findUnique({
            where: { userId_courseId: { userId, courseId: course.id } },
            include: { user: { select: { id: true, fullName: true, avatar: true } } },
          })
        : Promise.resolve(null),
    ])

    const { enrollments, ...rest } = course as any
    return {
      ...rest,
      isEnrolled: enrollments ? enrollments.length > 0 : false,
      userReview: userReview,
      overallAnalytics: {
        avgRating: avgRatingRes._avg.rating || 0,
        totalStudents,
        completionRate: 0, // Tạm thời
      },
    }
  }
  async getHomeSections(userId?: string) {
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
    } as const

    const publishedWhere = { status: CourseStatus.PUBLISHED }

    const [trending, topSelling, newest, topRated, userEnrollments] = await Promise.all([
      // Trending: khoá học có nhiều enrollment nhất
      this.txHost.tx.course.findMany({
        where: publishedWhere,
        orderBy: { enrollments: { _count: 'desc' } },
        take: 5,
        select: baseSelect,
      }),

      // Top Selling: khoá học có nhiều transaction COMPLETED nhất
      this.txHost.tx.course.findMany({
        where: publishedWhere,
        orderBy: { transactions: { _count: 'desc' } },
        take: 10,
        select: baseSelect,
      }),

      // Newest: khoá học mới tạo/publish gần đây nhất
      this.txHost.tx.course.findMany({
        where: publishedWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),

      // Top Rated: khoá học có nhiều review và review mới nhất
      this.txHost.tx.course.findMany({
        where: publishedWhere,
        orderBy: [{ reviews: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 5,
        select: baseSelect,
      }),
      userId
        ? this.txHost.tx.enrollment.findMany({
            where: { userId },
            select: { courseId: true },
          })
        : Promise.resolve([]),
    ])

    const enrolledIds = new Set(userEnrollments.map((e) => e.courseId))

    // --- Helper để gộp analytics cho danh sách khóa học ---
    const attachAnalytics = async (courses: any[]) => {
      return await Promise.all(
        courses.map(async (c) => {
          const [avgRatingRes, totalStudents] = await Promise.all([
            this.txHost.tx.review.aggregate({
              where: { courseId: c.id },
              _avg: { rating: true },
            }),
            this.txHost.tx.enrollment.count({
              where: { courseId: c.id },
            }),
          ])

          return {
            ...c,
            isEnrolled: enrolledIds.has(c.id),
            overallAnalytics: {
              avgRating: avgRatingRes._avg.rating || 0,
              totalStudents,
              avgInterestScore: 0,
            },
          }
        }),
      )
    }

    return {
      trending: await attachAnalytics(trending),
      topSelling: await attachAnalytics(topSelling),
      newest: await attachAnalytics(newest),
      topRated: await attachAnalytics(topRated),
    }
  }

  getCategories() {
    return this.txHost.tx.category.findMany({
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
    return this.txHost.tx.course.findMany({
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
    })
  }

  getAllSlugs() {
    return this.txHost.tx.course
      .findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => rows.map((r) => r.slug))
  }

  getCourseUnique(body: { id: string } | { slug: string } | { creatorId: string; id: string }) {
    return this.txHost.tx.course.findUnique({
      where: body,
    })
  }

  getCourseUniqueIncludeChapters(body: { id: string } | { slug: string } | { creatorId: string; id: string }) {
    return this.txHost.tx.course.findUnique({
      where: body,
      include: {
        chapters: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    })
  }

  updateCourseBaseInfo(courseId: string, creatorId: string, dto: CreateCourseSt1Dto, slug?: string) {
    return this.txHost.tx.course.update({
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
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    })
  }

  finishCreateCourse(courseId: string, payload: CreateCourseSt3Dto & { creatorId: string }) {
    return this.txHost.tx.course.update({
      where: {
        id_creatorId: {
          id: courseId,
          creatorId: payload.creatorId,
        },
      },
      data: {
        isFree: payload.isFree,
        price: payload.price,
        originalPrice: payload.originalPrice,
      },
      include: {
        chapters: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    })
  }

  completeCourse(courseId: string, creatorId: string) {
    return this.txHost.tx.course.update({
      where: {
        id_creatorId: {
          id: courseId,
          creatorId,
        },
      },
      data: {
        isCompleted: true,
      },
      include: {
        chapters: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    })
  }

  findChapterOrder(chapterId: string | null) {
    return this.txHost.tx.chapter.findUnique({ where: { id: chapterId ?? undefined }, select: { order: true } })
  }

  updateChapterOrder(chapterId: string, newOrder: number) {
    return this.txHost.tx.chapter.update({
      where: { id: chapterId },
      data: {
        order: newOrder,
      },
    })
  }

  renameChapter(chapterId: string, title: string) {
    return this.txHost.tx.chapter.update({
      where: { id: chapterId },
      data: { title },
      select: { id: true, title: true, order: true, courseId: true },
    })
  }

  findChapterUnique(payload: { id: string; creatorId: string }) {
    return this.txHost.tx.chapter.findFirst({
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

    const [courses, total] = await Promise.all([
      this.txHost.tx.course.findMany({
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
        },
      }),
      this.txHost.tx.course.count({ where }),
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

  getCourseDetailManager(body: { creatorId: string; id: string }) {
    return this.txHost.tx.course.findUnique({
      where: body,
      select: {
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
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        chapters: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: [{ order: 'asc' }, { id: 'asc' }],
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
      },
    })
  }

  findCoursePublic(courseId: string) {
    return this.txHost.tx.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
      },
      select: {
        id: true,
        status: true,
        isFree: true,
      },
    })
  }

  getCourseProgress(userId: string, courseId: string) {
    return this.txHost.tx.chapter.findMany({
      where: { courseId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        order: true,
        lessons: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            type: true,
            order: true,
            duration: true,
            progress: {
              where: { userId },
              select: { isCompleted: true, lastAccess: true },
            },
          },
        },
      },
    })
  }

  async getProgressSummary(userId: string, courseId: string) {
    const [total, completed] = await Promise.all([
      this.txHost.tx.lesson.count({ where: { chapter: { courseId } } }),
      this.txHost.tx.progress.count({
        where: { userId, isCompleted: true, lesson: { chapter: { courseId } } },
      }),
    ])
    return {
      totalLessons: total,
      completedLessons: completed,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }
  async updateCourseStatus(courseId: string, status: CourseStatus) {
    return this.txHost.tx.course.update({
      where: { id: courseId },
      data: { status },
    })
  }
  async countPublishedCoursesByCreator(creatorId: string) {
    return this.txHost.tx.course.count({
      where: { creatorId, status: CourseStatus.PUBLISHED },
    })
  }

  async countCoursesByCreatorAndStatus(creatorId: string, status: CourseStatus) {
    return this.txHost.tx.course.count({
      where: { creatorId, status },
    })
  }

  async countEnrollmentsByCourse(courseId: string) {
    return this.txHost.tx.enrollment.count({
      where: { courseId },
    })
  }

  async countLessonsByCourse(courseId: string) {
    return this.txHost.tx.lesson.count({
      where: {
        chapter: {
          courseId,
        },
      },
    })
  }

  async findChapterByUserId(userId: string, chapterId: string, courseId: string) {
    return this.txHost.tx.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
        course: {
          creatorId: userId,
        },
      },
      include: {
        _count: {
          select: {
            lessons: true, // Trả về số lượng bài học trong chapter này
          },
        },
      },
    })
  }

  deleteChapter(chapterId: string) {
    return this.txHost.tx.chapter.delete({
      where: { id: chapterId },
    })
  }

  deleteCourse(courseId: string, creatorId: string) {
    return this.txHost.tx.course.delete({
      where: {
        id_creatorId: {
          id: courseId,
          creatorId,
        },
      },
    })
  }
}
