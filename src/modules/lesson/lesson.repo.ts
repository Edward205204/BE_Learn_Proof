import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { LessonTypeEnumTS, VideoProviderEnumTS } from './lesson.model'
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
    fullDesc: string | null
    order: number
    videoId: string | null
    provider: VideoProviderEnumTS | null
    duration: number | null
    chapterId: string
    textContent: string | null
  }) {
    return this.txHost.tx.lesson.create({
      data,
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        chapterId: true,
      },
    })
  }
}
