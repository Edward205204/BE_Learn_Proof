import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { QuizType } from 'src/generated/prisma/enums'

@Injectable()
export class QuizRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  findLessonWithAuthorId({ id, authorId }: { id: string; authorId: string }) {
    return this.txHost.tx.lesson.findFirst({
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

  findQuiz(where: { id: string; lessonId: string }) {
    return this.txHost.tx.quiz.findUnique({
      where,
    })
  }

  findQuizByLesson(lessonId: string) {
    return this.txHost.tx.quiz.findFirst({
      where: {
        lessonId,
      },
    })
  }

  createQuiz(data: { type: QuizType; title?: string; description?: string; lessonId?: string; chapterId?: string }) {
    return this.txHost.tx.quiz.create({
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
    return this.txHost.tx.quiz.create({
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
    return this.txHost.tx.quiz.update({
      where,
      data,
    })
  }

  deleteQuiz(where: { id: string }) {
    return this.txHost.tx.quiz.delete({
      where,
    })
  }

  getQuizDetail(quizId: string) {
    return this.txHost.tx.quiz.findUnique({
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
    return this.txHost.tx.question.create({
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
    return this.txHost.tx.question.findUnique({
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
    return this.txHost.tx.question.update({
      where,
      data,
    })
  }

  deleteQuestion(where: { id: string }) {
    return this.txHost.tx.question.delete({
      where,
    })
  }
  findQuizById(id: string) {
    return this.txHost.tx.quiz.findUnique({
      where: { id },
    })
  }

  findQuizByChapter(chapterId: string) {
    return this.txHost.tx.quiz.findFirst({
      where: {
        chapterId,
        type: 'CHAPTER',
      },
    })
  }

  findChapterWithAuthorId({ id, authorId }: { id: string; authorId: string }) {
    return this.txHost.tx.chapter.findFirst({
      where: {
        id,
        course: {
          creatorId: authorId,
        },
      },
    })
  }
}
