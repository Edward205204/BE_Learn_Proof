import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { LessonTypeEnumTS, QuizDataType, VideoProviderEnumTS } from './lesson.model'

@Injectable()
export class LessonRepo {
  constructor(private readonly prisma: PrismaService) {}

  findChapterWithAuthorId({ id: chapterId, authorId: userId }: { id: string; authorId: string }) {
    return this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        course: {
          creatorId: userId,
        },
      },
    })
  }

  async getLastLessonOrder(chapterId: string) {
    const lastLesson = await this.prisma.lesson.findFirst({
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
    return this.prisma.lesson.create({ data })
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
    return this.prisma.lesson.create({
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
