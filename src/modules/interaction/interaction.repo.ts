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
    return this.prisma.discussion.findMany({
      where: {
        courseId,
        lessonId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      // pin lên trước
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    })
  }

  async
  findAllComments(page: number, limit: number) {
    return this.prisma.discussion.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })
  }

  async findCommentById(id: string) {
    return this.prisma.discussion.findUnique({
      where: { id },
    })
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
  
}
