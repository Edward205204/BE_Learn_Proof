import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { Injectable } from '@nestjs/common'
import { CourseStatus, PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class EnrollmentRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  // ─── Write: chỉ enrollment + transaction ───────────────────────────────────

  upsertEnrollment(courseId: string, userId: string) {
    return this.txHost.tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    })
  }

  updateEnrollmentCompleted(userId: string, courseId: string) {
    return this.txHost.tx.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { completedAt: new Date() },
    })
  }

  findCourseForEnroll(courseId: string) {
    return this.txHost.tx.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
      select: { id: true, isFree: true },
    })
  }

  getEnrollmentUnique(userId: string, courseId: string) {
    if (!userId || !courseId) return null
    return this.txHost.tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
  }

  getOwnedCourseIds(userId: string, courseIds: string[]) {
    return this.txHost.tx.enrollment.findMany({
      where: {
        userId,
        courseId: {
          in: courseIds,
        },
      },
      select: {
        courseId: true,
      },
    })
  }

  async getEnrolledUserIdsByCourse(courseId: string): Promise<string[]> {
    const enrollments = await this.txHost.tx.enrollment.findMany({
      where: { courseId },
      select: { userId: true },
    })
    return enrollments.map((e) => e.userId)
  }

  upsertManyEnrollments(userId: string, courseIds: string[]) {
    return this.txHost.tx.enrollment.createMany({
      data: courseIds.map((courseId) => ({ userId, courseId })),
      skipDuplicates: true,
    })
  }

  getMyEnrollmentsByUserId(userId: string) {
    return this.txHost.tx.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        enrolledAt: true,
        completedAt: true,
        lastCaughtUpAt: true,
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            slug: true,
            isFree: true,
            level: true,
            creator: { select: { fullName: true, avatar: true } },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })
  }

  async getCourseAnalyticsByCourseIds(courseIds: string[]) {
    if (!courseIds.length) return new Map<string, { avgRating: number; totalStudents: number }>()

    const [ratingRows, enrollmentRows] = await Promise.all([
      this.txHost.tx.review.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _avg: { rating: true },
      }),
      this.txHost.tx.enrollment.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _count: { _all: true },
      }),
    ])

    const ratingMap = new Map(ratingRows.map((row) => [row.courseId, row._avg.rating || 0]))
    const studentsMap = new Map(enrollmentRows.map((row) => [row.courseId, row._count._all]))

    const analyticsMap = new Map<string, { avgRating: number; totalStudents: number }>()
    for (const courseId of courseIds) {
      analyticsMap.set(courseId, {
        avgRating: ratingMap.get(courseId) || 0,
        totalStudents: studentsMap.get(courseId) || 0,
      })
    }
    return analyticsMap
  }

  async getProgressSummariesByCourseIds(userId: string, courseIds: string[]) {
    if (!courseIds.length)
      return new Map<string, { totalLessons: number; completedLessons: number; progressPercent: number }>()

    const [lessonRows, progressRows] = await Promise.all([
      this.txHost.tx.lesson.findMany({
        where: {
          chapter: {
            courseId: {
              in: courseIds,
            },
          },
        },
        select: {
          chapter: {
            select: {
              courseId: true,
            },
          },
        },
      }),
      this.txHost.tx.progress.findMany({
        where: {
          userId,
          isCompleted: true,
          lesson: {
            chapter: {
              courseId: {
                in: courseIds,
              },
            },
          },
        },
        select: {
          lesson: {
            select: {
              chapter: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      }),
    ])

    const totalMap = new Map<string, number>()
    for (const row of lessonRows) {
      const courseId = row.chapter.courseId
      totalMap.set(courseId, (totalMap.get(courseId) || 0) + 1)
    }

    const completedMap = new Map<string, number>()
    for (const row of progressRows) {
      const courseId = row.lesson.chapter.courseId
      completedMap.set(courseId, (completedMap.get(courseId) || 0) + 1)
    }

    const progressMap = new Map<string, { totalLessons: number; completedLessons: number; progressPercent: number }>()
    for (const courseId of courseIds) {
      const totalLessons = totalMap.get(courseId) || 0
      const completedLessons = completedMap.get(courseId) || 0
      progressMap.set(courseId, {
        totalLessons,
        completedLessons,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      })
    }
    return progressMap
  }
}
