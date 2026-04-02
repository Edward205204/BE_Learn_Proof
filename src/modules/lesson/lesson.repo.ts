import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { LessonTypeEnumTS, QuizDataType, VideoProviderEnumTS } from './lesson.model'

@Injectable()
export class LessonRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

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

  async getLastLessonOrder(chapterId: string) {
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
    return this.txHost.tx.lesson.create({ data })
  }

  createLessonWithQuiz(
    lessonData: {
      title: string
      shortDesc: string | null
      fullDesc: string | null
      order: number
      chapterId: string
    },
    quizData: QuizDataType,
  ) {
    return this.txHost.tx.lesson.create({
      data: {
        type: 'QUIZ',
        ...lessonData,
        videoId: null,
        provider: null,
        duration: null,
        textContent: null,
        quizzes: {
          create: {
            type: 'LESSON',
            title: quizData.title,
            description: quizData.description,
            questions: {
              create: quizData.questions.map((q) => ({
                content: q.content,
                answers: {
                  create: q.answers,
                },
              })),
            },
          },
        },
      },
      include: {
        quizzes: {
          include: {
            questions: {
              include: {
                answers: true,
              },
            },
          },
        },
      },
    })
  }
}
