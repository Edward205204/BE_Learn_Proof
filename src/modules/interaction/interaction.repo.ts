import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class InteractionRepo {
  constructor(private prisma: PrismaService) {}

  async findLessonInCourse(courseId: string, lessonId: string) {
    return this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        chapter: {
          courseId,
        },
      },
    })
  }

  async checkUserEnrollment(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })
  }

  async findLessonComments(courseId: string, lessonId: string, page: number, limit: number) {
    const where = {
      courseId,
      lessonId,
      isDeleted: false,
    }
    const [data, total] = await Promise.all([
      this.prisma.discussion.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, avatar: true },
          },
          replies: {
            where: { isDeleted: false },
            include: {
              user: { select: { id: true, fullName: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.discussion.count({ where }),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findAllComments(page: number, limit: number) {
    const where = { isDeleted: false }
    const [data, total] = await Promise.all([
      this.prisma.discussion.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, avatar: true },
          },
          lesson: {
            select: {
              id: true,
              title: true,
              chapter: {
                select: {
                  course: {
                    select: { id: true, title: true },
                  },
                },
              },
            },
          },
          replies: {
            where: { isDeleted: false },
            include: {
              user: { select: { id: true, fullName: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.discussion.count({ where }),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findCommentById(id: string) {
    return this.prisma.discussion.findUnique({
      where: { id },
      include: {
        course: {
          select: { creatorId: true },
        },
      },
    })
  }

  async findCourseCreatorId(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true },
    })
    return course?.creatorId
  }

  async updateComment(id: string, data: any) {
    return this.prisma.discussion.update({
      where: { id },
      data,
    })
  }
  async createComment(data: any) {
    return this.prisma.discussion.create({
      data,
    })
  }
  async createReply(data: any) {
    return this.prisma.reply.create({
      data,
    })
  }
  async findReplyById(id: string) {
    return this.prisma.reply.findUnique({
      where: { id },
    })
  }
  async updateReply(id: string, data: any) {
    return this.prisma.reply.update({
      where: { id },
      data,
    })
  }

  async findCourseReviews(courseId: string, page: number, limit: number) {
    const where = { courseId }
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findAllReviews(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        include: {
          user: {
            select: { id: true, fullName: true, avatar: true },
          },
          course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count(),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findReviewByUserAndCourse(userId: string, courseId: string) {
    return this.prisma.review.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })
  }

  async createReview(data: any) {
    return this.prisma.review.create({
      data,
    })
  }
}
