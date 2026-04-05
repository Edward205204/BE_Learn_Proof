import { Injectable } from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { CreateQuizType, QuestionType } from './quiz.model'
import {
  QuestionHasMultipleCorrectAnswersException,
  QuestionMissingCorrectAnswerException,
  QuestionNotFoundException,
  QuestionNotInEditModeException,
} from './quiz.error'
import { Transactional } from '@nestjs-cls/transactional'

// quiz modules này là sub modules của lesson  modules
// tạo lesson rồi mới gọi quiz service để tạo quiz cho lesson đó
// nó không cần biết là quiz của lesson hay chapter
@Injectable()
export class QuizCmsService {
  constructor(private readonly quizRepo: QuizRepo) {}

  /** Một query tối thiểu (id + isEdit) cho mọi mutation cấp câu hỏi. */
  private async requireQuestionInEditMode(questionId: string) {
    const row = await this.quizRepo.findQuestionEditState(questionId)
    if (!row) {
      throw new QuestionNotFoundException()
    }
    if (!row.isEdit) {
      throw new QuestionNotInEditModeException()
    }
  }

  async createQuiz(body: CreateQuizType) {
    /**
     * Tạo quiz với nested create (1 transaction, ~41 queries tuần tự).
     *
     * Nếu cần tối ưu sau này (khi quiz có nhiều câu hỏi hoặc traffic cao):
     * - Dùng createId() để generate ID trước ở app layer
     * - Thay bằng Promise.all([quiz.create, question.createMany, answer.createMany])
     * - Giảm xuống còn 3 queries song song thay vì ~41 tuần tự
     * - Xem git blame hoặc tìm "TODO: optimize quiz creation" để biết thêm
     */
    const quiz = await this.quizRepo.createQuiz(body)
    return quiz
  }

  addQuestionForQuiz(quizId: string, questionData: QuestionType) {
    // ko cần check rules vì đã có zod validation ở model
    return this.quizRepo.createQuestion(quizId, questionData)
  }

  async addAnswerForQuestion(questionId: string, content: string) {
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.createAnswer(questionId, content)
  }

  getQuizForCMS(lessonId: string) {
    return this.quizRepo.getQuizCMS(lessonId)
  }

  async deleteQuestionFromQuiz(questionId: string) {
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.deleteQuestions(questionId)
  }

  deleteQuiz(quizId: string) {
    return this.quizRepo.deleteQuiz(quizId)
  }

  async deleteAnswer(questionId: string, answerId: string) {
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.deleteAnswers(questionId, answerId)
  }

  async editQuestion(questionId: string, content: string) {
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.updateContentOfQuestion(questionId, content)
  }

  async editAnswer(answerId: string, questionId: string, content: string) {
    await this.requireQuestionInEditMode(questionId)
    return this.quizRepo.updateAnswer(answerId, questionId, content)
  }

  @Transactional()
  async chooseCorrectAnswer(questionId: string, answerId: string) {
    await this.requireQuestionInEditMode(questionId)

    await this.quizRepo.updateAllAnswerIsFalse(questionId)
    await this.quizRepo.updateCorrectAnswer(answerId)
    return true
  }

  async finishEditQuestion(questionId: string) {
    const answers = await this.quizRepo.findAnswerByQuestionId(questionId)

    if (answers.length < 2) {
      throw new QuestionMissingCorrectAnswerException()
    }

    const correctAnswer = answers.filter((answer) => answer.isCorrect)
    if (correctAnswer.length !== 1) {
      throw new QuestionHasMultipleCorrectAnswersException()
    }

    // false vì đã hoàn thành edit question
    await this.quizRepo.updateIsEditOfQuestion(questionId, false)
    return true
  }
}
