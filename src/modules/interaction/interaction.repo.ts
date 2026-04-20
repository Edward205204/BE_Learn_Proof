import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class InteractionRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  findLessonInCourse(courseId: string, lessonId: string) {
    return this.txHost.tx.lesson.findFirst({
      where: {
        id: lessonId,
        chapter: {
          courseId,
        },
      },
    })
  }

  checkUserEnrollment(userId: string, courseId: string) {
    return this.txHost.tx.enrollment.findUnique({
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
      this.txHost.tx.discussion.findMany({
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
      this.txHost.tx.discussion.count({ where }),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findAllComments(page: number, limit: number, creatorId?: string) {
    const where: any = { isDeleted: false }
    if (creatorId) {
      where.course = { creatorId }
    }
    const [data, total] = await Promise.all([
      this.txHost.tx.discussion.findMany({
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
      this.txHost.tx.discussion.count({ where }),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  findCommentById(id: string) {
    return this.txHost.tx.discussion.findUnique({
      where: { id },
      include: {
        course: {
          select: { creatorId: true },
        },
      },
    })
  }

  async findCourseCreatorId(courseId: string) {
    const course = await this.txHost.tx.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true },
    })
    return course?.creatorId
  }

  updateComment(id: string, data: any) {
    return this.txHost.tx.discussion.update({
      where: { id },
      data,
    })
  }
  createComment(data: any) {
    return this.txHost.tx.discussion.create({
      data,
    })
  }
  createReply(data: any) {
    return this.txHost.tx.reply.create({
      data,
    })
  }
  findReplyById(id: string) {
    return this.txHost.tx.reply.findUnique({
      where: { id },
    })
  }
  updateReply(id: string, data: any) {
    return this.txHost.tx.reply.update({
      where: { id },
      data,
    })
  }

  async findCourseReviews(courseId: string, page: number, limit: number) {
    const where = { courseId }
    const [data, total] = await Promise.all([
      this.txHost.tx.review.findMany({
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
      this.txHost.tx.review.count({ where }),
    ])

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findAllReviews(page: number, limit: number, creatorId?: string) {
    const where: any = {}
    if (creatorId) {
      where.course = { creatorId }
    }
    const [data, total] = await Promise.all([
      this.txHost.tx.review.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatar: true } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.txHost.tx.review.count({ where }),
    ])
    return { data, total, totalPages: Math.ceil(total / limit) }
  }

  findReviewById(id: string) {
    return this.txHost.tx.review.findUnique({
      where: { id },
      include: {
        course: {
          select: { creatorId: true },
        },
      },
    })
  }

  findReviewByUserAndCourse(userId: string, courseId: string) {
    return this.txHost.tx.review.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })
  }

  createReview(data: any) {
    return this.txHost.tx.review.create({
      data,
    })
  }

  updateReview(id: string, data: { 
    rating?: number; 
    comment?: string; 
    instructorReply?: string; 
    instructorReplyAt?: Date | null;
    learnerReply?: string;
    learnerReplyAt?: Date | null;
  }) {
    return this.txHost.tx.review.update({
      where: { id },
      data,
    })
  }

  deleteReview(id: string) {
    return this.txHost.tx.review.delete({
      where: { id },
    })
  }
}
