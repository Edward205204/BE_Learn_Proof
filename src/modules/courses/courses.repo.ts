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
          orderBy: { order: 'asc' }, // Lấy ra luôn danh sách đã sắp xếp
        },
      },
    })
  }

  // ----- Public catalog -----

  async getCoursesCatalog(query: z.infer<typeof GetCoursesQuery>) {
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

    const [courses, total] = await Promise.all([
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

  getCourseDetail(slug: string) {
    return this.txHost.tx.course.findUnique({
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
    } as const

    const [trending, topSelling, newest, topRated] = await Promise.all([
      this.txHost.tx.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),

      this.txHost.tx.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: baseSelect,
      }),
      this.txHost.tx.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),
      this.txHost.tx.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: baseSelect,
      }),
    ])

    return { trending, topSelling, newest, topRated }
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
          orderBy: { order: 'asc' },
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
          orderBy: { order: 'asc' },
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
          orderBy: { order: 'asc' },
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
      },
    })
  }
}
