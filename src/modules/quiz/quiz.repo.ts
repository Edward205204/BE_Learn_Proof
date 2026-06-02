import { Injectable } from '@nestjs/common'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { CreateQuizType, QuestionType, AiQuizQuestionReviewType } from './quiz.model'
import { PrismaClient } from 'src/generated/prisma/client'
import { AiJobStatus, AiJobType, QuizDraftStatus } from 'src/generated/prisma/enums'
import { randomUUID } from 'crypto'

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

  deleteAnswersByQuestionId(questionId: string) {
    return this.txHost.tx.answer.deleteMany({
      where: { questionId },
    })
  }

  createAnswersForQuestion(questionId: string, options: string[], correctIndex: number) {
    return this.txHost.tx.answer.createMany({
      data: options.map((content, index) => ({
        content,
        isCorrect: index === correctIndex,
        questionId,
      })),
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

  async findQuizForLearnerByLessonId(lessonId: string) {
    const quiz = await this.txHost.tx.quiz.findFirst({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        questions: {
          orderBy: { createdAt: 'asc' },
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

    if (!quiz) return null

    const questions = quiz.questions
    if (questions.length <= 20) {
      return quiz
    }

    const shuffled = [...questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }

    return {
      ...quiz,
      questions: shuffled.slice(0, 20),
    }
  }

  findQuizByLessonId(lessonId: string) {
    return this.txHost.tx.quiz.findFirst({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        questions: {
          orderBy: { createdAt: 'asc' },
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

  createEmptyQuiz(lessonId: string) {
    return this.txHost.tx.quiz.create({
      data: { lessonId },
      select: { id: true, lessonId: true },
    })
  }

  findQuizIdByLessonId(lessonId: string) {
    return this.txHost.tx.quiz.findFirst({
      where: { lessonId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
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
        type: AiJobType.QUIZ_GENERATION,
        status: { in: [AiJobStatus.QUEUED, AiJobStatus.PROCESSING] },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  findDraftQuizForLesson(lessonId: string) {
    return this.txHost.tx.quizDraft.findFirst({
      where: { lessonId, status: QuizDraftStatus.DRAFT_AI },
      orderBy: { createdAt: 'desc' },
    })
  }

  createAiJob(data: { lessonId: string; requestedBy: string; type: AiJobType }) {
    return this.txHost.tx.aiJob.create({
      data,
    })
  }

  updateAiJobStatus(
    aiJobId: string,
    status: AiJobStatus,
    data?: {
      model?: string
      tokenInput?: number
      tokenOutput?: number
      latencyMs?: number
      error?: string
    },
  ) {
    return this.txHost.tx.aiJob.update({
      where: { id: aiJobId },
      data: {
        status,
        ...data,
      },
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
      include: {
        aiJob: true,
        lesson: {
          select: {
            id: true,
            title: true,
            shortDesc: true,
            type: true,
            targetLevel: true,
          },
        },
      },
    })
  }

  updateDraftStatus(
    draftId: string,
    status: QuizDraftStatus,
    data?: { reviewNote?: string; reviewerId?: string },
  ) {
    return this.txHost.tx.quizDraft.update({
      where: { id: draftId },
      data: {
        status,
        ...data,
      },
    })
  }

  updateDraftValidatedOutput(draftId: string, validatedOutput: AiQuizQuestionReviewType[]) {
    return this.txHost.tx.quizDraft.update({
      where: { id: draftId },
      data: {
        validatedOutput: {
          questions: validatedOutput,
        },
      },
    })
  }

  async appendQuizFromDraft(lessonId: string, rawOutput: { question: string; options: string[]; correctIndex: number }[]) {
    const existingQuiz = await this.findQuizIdByLessonId(lessonId)

    const quizId =
      existingQuiz?.id ??
      (await this.txHost.tx.quiz.create({
        data: { lessonId },
        select: { id: true },
      })).id

    if (rawOutput.length === 0) {
      return { quizId, insertedQuestions: 0 }
    }

    const questions = rawOutput.map((item) => ({
      id: randomUUID(),
      content: item.question,
      isEdit: false,
      quizId,
    }))

    const answers = rawOutput.flatMap((item, questionIndex) =>
      item.options.map((option, answerIndex) => ({
        id: randomUUID(),
        content: option,
        isCorrect: answerIndex === item.correctIndex,
        questionId: questions[questionIndex].id,
      })),
    )

    await this.txHost.tx.question.createMany({
      data: questions,
    })

    await this.txHost.tx.answer.createMany({
      data: answers,
    })

    return { quizId, insertedQuestions: questions.length }
  }

  async appendSingleQuestionToQuiz(lessonId: string, question: { question: string; options: string[]; correctIndex: number }) {
    let quiz = await this.findQuizIdByLessonId(lessonId)

    if (!quiz) {
      quiz = await this.createEmptyQuiz(lessonId)
    }

    const createdQuestion = await this.txHost.tx.question.create({
      data: {
        content: question.question,
        isEdit: false,
        quizId: quiz.id,
        answers: {
          create: question.options.map((option, answerIndex) => ({
            content: option,
            isCorrect: answerIndex === question.correctIndex,
          })),
        },
      },
    })

    return {
      quizId: quiz.id,
      questionId: createdQuestion.id,
    }
  }
}
