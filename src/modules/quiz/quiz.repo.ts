import { Injectable } from '@nestjs/common'
import { QuizType } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class QuizRepo {
  constructor(private prisma: PrismaService) {}

  findQuiz(where: { id: string; lessonId: string }) {
    return this.prisma.quiz.findUnique({
      where,
    })
  }

  findQuizByLesson(lessonId: string) {
    return this.prisma.quiz.findFirst({
      where: {
        lessonId,
      },
    })
  }

  createQuiz(data: { type: QuizType; title?: string; description?: string; lessonId?: string; chapterId?: string }) {
    return this.prisma.quiz.create({
      data,
    })
  }

  createQuizWithQuestions(data: {
    type: QuizType
    lessonId: string
    title?: string
    description?: string
    questions: { content: string; answers: { content: string; isCorrect: boolean }[] }[]
  }) {
    return this.prisma.quiz.create({
      data: {
        type: data.type,
        lessonId: data.lessonId,
        title: data.title,
        description: data.description,
        questions: {
          create: data.questions.map((q) => ({
            content: q.content,
            answers: {
              create: q.answers,
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    })
  }

  updateQuiz({
    where,
    data,
  }: {
    where: { id: string }
    data: {
      title?: string
      description?: string
    }
  }) {
    return this.prisma.quiz.update({
      where,
      data,
    })
  }

  deleteQuiz(where: { id: string }) {
    return this.prisma.quiz.delete({
      where,
    })
  }

  getQuizDetail(quizId: string) {
    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    })
  }

  createQuestion(data: { quizId: string; content: string; answers: { content: string; isCorrect: boolean }[] }) {
    return this.prisma.question.create({
      data: {
        content: data.content,
        quizId: data.quizId,
        answers: {
          create: data.answers,
        },
      },
      include: {
        answers: true,
      },
    })
  }

  findQuestion(where: { id: string }) {
    return this.prisma.question.findUnique({
      where,
    })
  }

  updateQuestion({
    where,
    data,
  }: {
    where: { id: string }
    data: {
      content?: string
    }
  }) {
    return this.prisma.question.update({
      where,
      data,
    })
  }

  deleteQuestion(where: { id: string }) {
    return this.prisma.question.delete({
      where,
    })
  }
  findQuizById(id: string) {
    return this.prisma.quiz.findUnique({
      where: { id },
    })
  }

  findQuizByChapter(chapterId: string) {
    return this.prisma.quiz.findFirst({
      where: {
        chapterId,
        type: 'CHAPTER',
      },
    })
  }
}
