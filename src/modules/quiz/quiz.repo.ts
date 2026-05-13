import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { CreateQuizType, QuestionType } from './quiz.model'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class QuizRepo {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>) {}

  // cross-read: lesson → chapter → course
  findQuizOwner(quizId: string) {
    return this.txHost.tx.quiz.findUnique({
      where: { id: quizId },
      select: {
        lesson: { select: { chapter: { select: { course: { select: { creatorId: true } } } } } },
      },
    })
  }

  findLessonOwner(lessonId: string) {
    return this.txHost.tx.lesson.findUnique({
      where: { id: lessonId },
      select: {
        chapter: { select: { course: { select: { creatorId: true } } } },
      },
    })
  }

  // cross-read: quiz → lesson → chapter → course → enrollment
  findQuizCourseEnrollment(quizId: string, userId: string) {
    return this.txHost.tx.quiz.findUnique({
      where: { id: quizId },
      select: {
        lesson: {
          select: {
            chapter: {
              select: {
                course: {
                  select: {
                    enrollments: {
                      where: { userId },
                      select: { id: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  createQuiz(body: CreateQuizType) {
    return this.txHost.tx.quiz.create({
      data: {
        lessonId: body.lessonId,
        questions: {
          create: body.quizData.map((q) => ({
            content: q.content,
            isEdit: false,
            answers: {
              create: q.answers.map((a) => ({
                content: a.content,
                isCorrect: a.isCorrect,
              })),
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

  findAnswerByQuestionId(questionId: string) {
    return this.txHost.tx.answer.findMany({
      where: { questionId },
    })
  }

  findQuizAttemptByUserIdAndQuizId(userId: string, quizId: string) {
    return this.txHost.tx.quizAttempt.findFirst({
      where: { userId, quizId },
    })
  }

  findCorrectAnswerByQuestionId(questionId: string) {
    return this.txHost.tx.answer.findFirst({
      where: { questionId, isCorrect: true },
      select: { id: true },
    })
  }

  findCorrectQuestionList(quizId: string) {
    return this.txHost.tx.question.findMany({
      where: { quizId, isEdit: false },
      select: {
        id: true,
        answers: {
          where: { isCorrect: true },
          select: { id: true },
        },
      },
    })
  }

  findQuestionEditState(questionId: string) {
    return this.txHost.tx.question.findUnique({
      where: { id: questionId },
      select: { id: true, isEdit: true },
    })
  }

  createQuestion(quizId: string, questionData: QuestionType) {
    return this.txHost.tx.question.create({
      data: {
        content: questionData.content,
        isEdit: false,
        quizId: quizId,
        answers: {
          create: questionData.answers.map((a) => ({
            content: a.content,
            isCorrect: a.isCorrect,
          })),
        },
      },
    })
  }

  deleteQuestions(questionId: string) {
    return this.txHost.tx.question.delete({
      where: { id: questionId },
    })
  }

  deleteQuiz(quizId: string) {
    return this.txHost.tx.quiz.delete({
      where: { id: quizId },
    })
  }

  deleteAnswers(questionId: string, answerId: string) {
    return this.txHost.tx.answer.delete({
      where: { id: answerId, questionId },
    })
  }

  createAnswer(questionId: string, content: string) {
    return this.txHost.tx.answer.create({
      data: {
        content,
        isCorrect: false,
        questionId: questionId,
      },
    })
  }

  updateContentOfQuestion(questionId: string, content: string) {
    return this.txHost.tx.question.update({
      where: { id: questionId },
      data: { content },
    })
  }

  updateAnswer(answerId: string, questionId: string, content: string) {
    return this.txHost.tx.answer.update({
      where: { id: answerId, questionId },
      data: { content },
    })
  }

  updateAllAnswerIsFalse(questionId: string) {
    return this.txHost.tx.answer.updateMany({
      where: { questionId },
      data: { isCorrect: false },
    })
  }

  updateCorrectAnswer(answerId: string, questionId: string) {
    return this.txHost.tx.answer.update({
      where: { id: answerId, questionId },
      data: { isCorrect: true },
    })
  }

  updateIsEditOfQuestion(questionId: string, isEdit: boolean) {
    return this.txHost.tx.question.update({
      where: { id: questionId },
      data: { isEdit },
    })
  }

  findQuizForLearnerByLessonId(lessonId: string) {
    return this.txHost.tx.quiz.findFirst({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        questions: {
          where: { isEdit: false },
          select: {
            id: true,
            content: true,
            answers: {
              select: {
                id: true,
                content: true,
              },
            },
          },
        },
      },
    })
  }

  findQuizByLessonId(lessonId: string) {
    return this.txHost.tx.quiz.findFirst({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        questions: {
          select: {
            id: true,
            isEdit: true,
            content: true,
            answers: {
              select: {
                id: true,
                content: true,
                isCorrect: true,
              },
            },
          },
        },
      },
    })
  }

  createQuizAttempt(body: { userId: string; quizId: string; score: number; correct: number; total: number }) {
    return this.txHost.tx.quizAttempt.create({
      data: body,
    })
  }

  // --- AI Quiz Draft Methods ---

  findDraftAiJobForLesson(lessonId: string) {
    return this.txHost.tx.aiJob.findFirst({
      where: {
        lessonId,
        type: 'QUIZ_GENERATION',
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
    })
  }

  findDraftQuizForLesson(lessonId: string) {
    return this.txHost.tx.quizDraft.findFirst({
      where: { lessonId, status: 'DRAFT_AI' },
    })
  }

  createAiJob(data: { lessonId: string; requestedBy: string; type: any }) {
    return this.txHost.tx.aiJob.create({
      data,
    })
  }

  findDraftsByLessonId(lessonId: string) {
    return this.txHost.tx.quizDraft.findMany({
      where: { lessonId },
      include: { aiJob: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  findDraftById(draftId: string) {
    return this.txHost.tx.quizDraft.findUnique({
      where: { id: draftId },
      include: { aiJob: true },
    })
  }

  updateDraftStatus(draftId: string, status: any, data?: { reviewNote?: string; reviewerId?: string }) {
    return this.txHost.tx.quizDraft.update({
      where: { id: draftId },
      data: {
        status,
        ...data,
      },
    })
  }

  async replaceQuizFromDraft(draftId: string, lessonId: string, rawOutput: any) {
    // Delete existing quiz for lesson
    await this.txHost.tx.quiz.deleteMany({
      where: { lessonId },
    })

    const questionsData = rawOutput.map((q: any) => ({
      content: q.question,
      isEdit: false,
      answers: {
        create: q.options.map((opt: string, index: number) => ({
          content: opt,
          isCorrect: index === q.correctIndex,
        })),
      },
    }))

    // Create new quiz
    return this.txHost.tx.quiz.create({
      data: {
        lessonId,
        questions: {
          create: questionsData,
        },
      },
    })
  }
}
