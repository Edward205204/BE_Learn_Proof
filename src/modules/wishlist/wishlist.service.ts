import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { CourseService } from '../courses/services/courses.service'

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
  ) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            creator: { select: { fullName: true } },
          },
        },
      },
    })
  }

  async addToWishlist(userId: string, courseIdOrSlug: string) {
    // Check if course exists by id or slug
    const course = await this.courseService.getCourseByIdOrSlug(courseIdOrSlug)

    if (!course) {
      throw new NotFoundException('Course not found')
    }

    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    })

    if (!existing) {
      return this.prisma.wishlistItem.create({
        data: { userId, courseId: course.id },
        include: { course: true },
      })
    }

    return existing
  }

  async removeFromWishlist(userId: string, courseIdOrSlug: string) {
    // Check if course exists by id or slug
    const course = await this.courseService.getCourseByIdOrSlug(courseIdOrSlug)

    if (!course) {
      throw new NotFoundException('Course not found')
    }

    return this.prisma.wishlistItem.deleteMany({
      where: {
        userId,
        courseId: course.id,
      },
    })
  }
}
