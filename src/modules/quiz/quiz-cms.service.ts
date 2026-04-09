import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { CreateQuizType, QuestionType } from './quiz.model'
import {
  QuestionHasMultipleCorrectAnswersException,
  QuestionMissingCorrectAnswerException,
  QuestionNotFoundException,
  QuestionNotInEditModeException,
} from './quiz.error'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class QuizCmsService {
  constructor(private readonly quizRepo: QuizRepo) {}

  private async requireQuizOwner(quizId: string, userId: string) {
    const quiz = await this.quizRepo.findQuizOwner(quizId)
    if (!quiz) throw new NotFoundException('Quiz không tồn tại')
    const creatorId = quiz.lesson?.chapter?.course?.creatorId
    if (creatorId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác quiz này')
  }

  private async requireQuestionInEditMode(questionId: string) {
    const row = await this.quizRepo.findQuestionEditState(questionId)
    if (!row) throw new QuestionNotFoundException()
    if (!row.isEdit) throw new QuestionNotInEditModeException()
  }

  async createQuiz(body: CreateQuizType) {
    return this.quizRepo.createQuiz(body)
  }

  async addQuestionForQuiz(quizId: string, questionData: QuestionType, userId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.createQuestion(quizId, questionData)
  }

  async addAnswerForQuestion(questionId: string, content: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.createAnswer(questionId, content)
  }

  getQuizByLessonId(lessonId: string) {
    return this.quizRepo.findQuizByLessonId(lessonId)
  }

  async deleteQuestionFromQuiz(questionId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.deleteQuestions(questionId)
  }

  async deleteQuiz(quizId: string, userId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.deleteQuiz(quizId)
  }

  async deleteAnswer(questionId: string, answerId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.deleteAnswers(questionId, answerId)
  }

  async editQuestion(questionId: string, content: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.updateContentOfQuestion(questionId, content)
  }

  async editAnswer(answerId: string, questionId: string, content: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.updateAnswer(answerId, questionId, content)
  }

  @Transactional()
  async chooseCorrectAnswer(questionId: string, answerId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    await this.requireQuestionInEditMode(questionId)
    await this.quizRepo.updateAllAnswerIsFalse(questionId)
    await this.quizRepo.updateCorrectAnswer(answerId, questionId)
    return true
  }

  async finishEditQuestion(questionId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    const answers = await this.quizRepo.findAnswerByQuestionId(questionId)

    if (answers.length < 2) throw new QuestionMissingCorrectAnswerException()

    const correctAnswer = answers.filter((answer) => answer.isCorrect)
    if (correctAnswer.length !== 1) throw new QuestionHasMultipleCorrectAnswersException()

    await this.quizRepo.updateIsEditOfQuestion(questionId, false)
    return true
  }
}
