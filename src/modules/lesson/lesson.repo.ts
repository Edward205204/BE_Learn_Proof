import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { LessonTypeEnumTS, UpdateLessonBodyType, VideoProviderEnumTS } from './lesson.model'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class LessonRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  findChapterWithAuthorId({ id: chapterId, authorId: userId }: { id: string; authorId: string }) {
    return this.txHost.tx.chapter.findFirst({
      where: {
        id: chapterId,
        course: {
          creatorId: userId,
        },
      },
    })
  }

  updateLesson(lessonId: string, body: UpdateLessonBodyType) {
    return this.txHost.tx.lesson.update({
      where: { id: lessonId },
      data: body,
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        chapterId: true,
        isLocked: true,
      },
    })
  }

  findLessonOrder(lessonId: string | null) {
    if (!lessonId) return Promise.resolve(null)
    return this.txHost.tx.lesson.findUnique({ where: { id: lessonId }, select: { order: true } })
  }

  updateLessonOrder(lessonId: string, newOrder: number, targetChapterId: string) {
    return this.txHost.tx.lesson.update({
      where: { id: lessonId },
      data: {
        order: newOrder,
        chapterId: targetChapterId,
      },
    })
  }

  deleteLesson(lessonId: string) {
    return this.txHost.tx.lesson.delete({
      where: { id: lessonId },
    })
  }

  async getLastLessonOrderInChapter(chapterId: string) {
    const lastLesson = await this.txHost.tx.lesson.findFirst({
      where: {
        chapterId,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    })

    return lastLesson ? lastLesson.order : 0
  }

  createLesson(data: {
    type: LessonTypeEnumTS
    title: string
    shortDesc: string | null
    order: number
    videoId: string | null
    provider: VideoProviderEnumTS | null
    duration: number | null
    chapterId: string
    textContent: string | null
    videoKey: string | null
  }) {
    return this.txHost.tx.lesson.create({
      data,
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        chapterId: true,
        isLocked: true,
      },
    })
  }

  toggleLessonLock(lessonId: string, isLocked: boolean) {
    return this.txHost.tx.lesson.update({
      where: { id: lessonId },
      data: { isLocked },
      select: { id: true, isLocked: true },
    })
  }

  findLessonDetail(lessonId: string) {
    return this.txHost.tx.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        shortDesc: true,
        type: true,
        order: true,
        videoId: true,
        provider: true,
        textContent: true,
        duration: true,
        chapterId: true,
        videoKey: true,
        isLocked: true,
      },
    })
  }

  /** Lấy tất cả lesson id đứng trước lessonId đó trong cùng khóa học (theo order) */
  async getLessonsPrecedingInCourse(lessonId: string) {
    // 1. lấy thông tin lesson hiện tại
    const lesson = await this.txHost.tx.lesson.findUnique({
      where: { id: lessonId },
      select: { order: true, chapter: { select: { order: true, courseId: true } } },
    })
    if (!lesson) return []
    const { order: lessonOrder, chapter } = lesson
    const { order: chapterOrder, courseId } = chapter
    // 2. lấy tất cả lesson trong khóa học có thứ tự trước bài này
    return this.txHost.tx.lesson.findMany({
      where: {
        chapter: { courseId },
        OR: [
          { chapter: { order: { lt: chapterOrder } } },
          { chapter: { order: chapterOrder }, order: { lt: lessonOrder } },
        ],
      },
      select: { id: true },
    })
  }

  upsertProgress(userId: string, lessonId: string) {
    return this.txHost.tx.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, isCompleted: true },
      update: { isCompleted: true },
    })
  }

  /** Tạo bản ghi progress (lần đầu học) để lưu startedAt */
  touchProgress(userId: string, lessonId: string) {
    return this.txHost.tx.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, isCompleted: false },
      update: {}, // không cập nhật gì nếu đã tồn tại
    })
  }

  getProgress(userId: string, lessonId: string) {
    return this.txHost.tx.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { isCompleted: true, startedAt: true },
    })
  }

  async getCompletedLessonIds(userId: string, lessonIds: string[]) {
    const rows = await this.txHost.tx.progress.findMany({
      where: { userId, lessonId: { in: lessonIds }, isCompleted: true },
      select: { lessonId: true },
    })
    return rows.map((r) => r.lessonId)
  }

  async countCourseProgress(userId: string, courseId: string) {
    const [total, completed] = await Promise.all([
      this.txHost.tx.lesson.count({ where: { chapter: { courseId } } }),
      this.txHost.tx.progress.count({
        where: { userId, isCompleted: true, lesson: { chapter: { courseId } } },
      }),
    ])
    return { total, completed }
  }

  checkEnrolled(userId: string, courseId: string) {
    return this.txHost.tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    })
  }
}
