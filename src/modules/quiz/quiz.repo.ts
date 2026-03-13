import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class QuizRepo {
  constructor(private prisma: PrismaService) {}

  findLessonWithAuthorId({ id, authorId }: { id: string; authorId: string }) {
    return this.prisma.lesson.findFirst({
      where: {
        id,
        chapter: {
          course: {
            creatorId: authorId,
          },
        },
      },
    })
  }

  findQuiz(where: { id?: string }) {
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

  createQuiz(data: {
    title?: string
    description?: string
    lessonId: string
  }) {
    return this.prisma.quiz.create({
      data,
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

  createQuestion(data: {
    quizId: string
    content: string
    answers: { content: string; isCorrect: boolean }[]
  }) {
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
}