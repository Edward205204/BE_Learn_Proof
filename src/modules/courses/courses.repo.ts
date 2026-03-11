import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import { CreateCourseSt1Dto, CreateCourseSt2Dto, GetCoursesQuery } from './courses.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CourseStatus, Prisma } from 'src/generated/prisma/client'

@Injectable()
export class CourseRepo {
  constructor(private prisma: PrismaService) {}

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    })
  }

  createCourseSt1(dto: CreateCourseSt1Dto, slug: string, creatorId: string) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        categoryId: dto.categoryId,
        tags: dto.tags ?? [],
        level: dto.level,
        shortDesc: dto.shortDesc,
        fullDesc: dto.fullDesc,
        thumbnail: dto.thumbnail ?? null,
        expectedDays: dto.expectedDays ?? null,
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
        tags: true,
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

  async syncChaptersFrame(dto: CreateCourseSt2Dto) {
    return await this.prisma.course.update({
      where: { id: dto.courseId },
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
        tags: true,
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
}
