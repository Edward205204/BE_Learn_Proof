import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { SubmitQuizType } from './quiz.model'
import { QuizHasNoQuestionsException } from './quiz.error'

@Injectable()
export class QuizLearnerService {
  constructor(private readonly quizRepo: QuizRepo) {}

  private async requireEnrolled(quizId: string, userId: string) {
    const quiz = await this.quizRepo.findQuizCourseEnrollment(quizId, userId)
    if (!quiz) throw new NotFoundException('Quiz không tồn tại')
    const enrollments = quiz.lesson?.chapter?.course?.enrollments
    if (!enrollments || enrollments.length === 0) {
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này')
    }
  }

  getQuizForLesson(lessonId: string) {
    return this.quizRepo.findQuizForLearnerByLessonId(lessonId)
  }

  async checkAnswer(questionId: string, userId: string, quizId: string) {
    await this.requireEnrolled(quizId, userId)
    return this.quizRepo.findCorrectAnswerByQuestionId(questionId)
  }

  async submitQuiz(userId: string, quizId: string, submission: SubmitQuizType) {
    await this.requireEnrolled(quizId, userId)

    const correctQuestions = await this.quizRepo.findCorrectQuestionList(quizId)
    const totalQuestions = correctQuestions.length

    if (totalQuestions === 0) throw new QuizHasNoQuestionsException()

    const userAnswersMap = new Map(submission.map((s) => [s.questionId, s.answerId]))

    let correctCount = 0
    correctQuestions.forEach((question) => {
      const userAnsId = userAnswersMap.get(question.id)
      if (userAnsId && question.answers.length > 0 && question.answers[0].id === userAnsId) {
        correctCount++
      }
    })

    const gradedTotal = Math.min(20, totalQuestions)
    const score = (correctCount / gradedTotal) * 10

    const result = await this.quizRepo.createQuizAttempt({
      quizId,
      userId,
      score,
      correct: correctCount,
      total: gradedTotal,
    })

    return {
      totalQuestions: gradedTotal,
      correctCount,
      score: score.toFixed(2),
      resultId: result.id,
    }
  }

  async getQuizResult(userId: string, quizId: string) {
    await this.requireEnrolled(quizId, userId)
    return this.quizRepo.findQuizAttemptByUserIdAndQuizId(userId, quizId)
  }
}
