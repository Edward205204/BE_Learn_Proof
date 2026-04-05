import { Injectable } from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { SubmitQuizType } from './quiz.model'
import { QuizHasNoQuestionsException } from './quiz.error'

@Injectable()
export class QuizLearnerService {
  constructor(private readonly quizRepo: QuizRepo) {}
  getQuizForUser(quizId: string) {
    return this.quizRepo.getQuizForUser(quizId)
  }

  checkAnswer(questionId: string) {
    // này là cho dạng review kiến thức, làm câu nào biết đáp án câu đó, ko lưu lại bài làm vào db
    return this.quizRepo.findCorrectAnswerByQuestionId(questionId)
  }

  async submitQuiz(userId: string, quizId: string, submission: SubmitQuizType) {
    // 1. Lấy data đáp án đúng từ DB
    const correctQuestions = await this.quizRepo.findCorrectQuestionList(quizId)
    const totalQuestions = correctQuestions.length

    if (totalQuestions === 0) throw new QuizHasNoQuestionsException()

    // 2. Chuyển submission của user thành Map để tìm kiếm O(1) và đảm bảo tính đúng đắn theo Question
    // Map<questionId, answerId>
    const userAnswersMap = new Map(submission.map((s) => [s.questionId, s.answerId]))

    // 3. Tính toán số câu đúng
    let correctCount = 0

    correctQuestions.forEach((question) => {
      const userAnsId = userAnswersMap.get(question.id)
      if (userAnsId && question.answers.length > 0 && question.answers[0].id === userAnsId) {
        correctCount++
      }
    })

    const score = (correctCount / totalQuestions) * 10

    const result = await this.quizRepo.createQuizAttempt({
      quizId,
      userId,
      score,
      correct: correctCount,
      total: totalQuestions,
    })

    return {
      totalQuestions,
      correctCount,
      score: score.toFixed(2),
      resultId: result.id,
    }
  }

  getQuizResult(userId: string, quizId: string) {
    return this.quizRepo.findQuizAttemptByUserIdAndQuizId(userId, quizId)
  }
}
