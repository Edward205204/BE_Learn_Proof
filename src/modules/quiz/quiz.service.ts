import { Injectable } from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import {
  QuizNotFoundException,
  LessonNotFoundException,
  QuestionNotFoundException,
} from './quiz.error'
import {
  CreateQuizBodyType,
  UpdateQuizBodyType,
  AddQuestionBodyType,
  SubmitQuizBodyType,
} from './quiz.model'

@Injectable()
export class QuizService {
  constructor(private readonly quizRepo: QuizRepo) {}

  async createQuiz(body: CreateQuizBodyType, userId: string) {
    const { lessonId, title, description } = body

    const lesson = await this.quizRepo.findLessonWithAuthorId({ id: lessonId, authorId: userId })
    if (!lesson) throw new LessonNotFoundException()

    const quiz = await this.quizRepo.createQuiz({
      title,
      description,
      lessonId,
    })

    return quiz
  }

  async updateQuiz(quizId: string, body: UpdateQuizBodyType) {
    const quiz = await this.quizRepo.findQuiz({ id: quizId })
    if (!quiz) throw new QuizNotFoundException()

    return this.quizRepo.updateQuiz({
      where: { id: quizId },
      data: body,
    })
  }

  async deleteQuiz(quizId: string) {
    const quiz = await this.quizRepo.findQuiz({ id: quizId })
    if (!quiz) throw new QuizNotFoundException()

    await this.quizRepo.deleteQuiz({ id: quizId })

    return { message: 'Quiz deleted successfully' }
  }

  async getQuizById(quizId: string) {
    const quiz = await this.quizRepo.getQuizDetail(quizId)

    if (!quiz) throw new QuizNotFoundException()

    return quiz
  }

  async getQuizByLesson(lessonId: string) {
    const quiz = await this.quizRepo.findQuizByLesson(lessonId)

    if (!quiz) throw new QuizNotFoundException()

    return quiz
  }

  async addQuestion(body: AddQuestionBodyType) {
    const { quizId, content, answers } = body

    const quiz = await this.quizRepo.findQuiz({ id: quizId })
    if (!quiz) throw new QuizNotFoundException()

    return this.quizRepo.createQuestion({
      quizId,
      content,
      answers,
    })
  }

  async updateQuestion(questionId: string, body: AddQuestionBodyType) {
    const question = await this.quizRepo.findQuestion({ id: questionId })
    if (!question) throw new QuestionNotFoundException()

    return this.quizRepo.updateQuestion({
      where: { id: questionId },
      data: body,
    })
  }

  async deleteQuestion(questionId: string) {
    const question = await this.quizRepo.findQuestion({ id: questionId })
    if (!question) throw new QuestionNotFoundException()

    await this.quizRepo.deleteQuestion({ id: questionId })

    return { message: 'Question deleted successfully' }
  }

  async submitQuiz(userId: string, body: SubmitQuizBodyType) {
    const { quizId, answers } = body

    const quiz = await this.quizRepo.getQuizDetail(quizId)
    if (!quiz) throw new QuizNotFoundException()

    let correct = 0

    for (const question of quiz.questions) {
      const userAnswer = answers.find((a) => a.questionId === question.id)

      const correctAnswer = question.answers.find((a) => a.isCorrect)

      if (userAnswer && userAnswer.answerId === correctAnswer?.id) {
        correct++
      }
    }

    const score = (correct / quiz.questions.length) * 100

    return {
      totalQuestions: quiz.questions.length,
      correctAnswers: correct,
      score,
    }
  }
}