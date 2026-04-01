import { Injectable, BadRequestException } from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { QuizNotFoundException, LessonNotFoundException, QuestionNotFoundException } from './quiz.error'
import { CreateQuizBodyType, UpdateQuizBodyType, AddQuestionBodyType, SubmitQuizBodyType } from './quiz.model'

@Injectable()
export class QuizService {
  constructor(private readonly quizRepo: QuizRepo) {}

  async createQuiz(body: CreateQuizBodyType, userId: string) {
    const { type, lessonId, chapterId, title, description } = body

    // 🔥 VALIDATE TYPE
    if (type === 'LESSON') {
      if (!lessonId) throw new BadRequestException('lessonId is required')

      const lesson = await this.quizRepo.findLessonWithAuthorId({
        id: lessonId,
        authorId: userId,
      })
      if (!lesson) throw new LessonNotFoundException()

      // ❗ tránh tạo duplicate quiz
      const existed = await this.quizRepo.findQuizByLesson(lessonId)
      if (existed) throw new BadRequestException('Lesson already has a quiz')
    }

    if (type === 'CHAPTER') {
      if (!chapterId) throw new BadRequestException('chapterId is required')

      const chapter = await this.quizRepo.findChapterWithAuthorId({
        id: chapterId,
        authorId: userId,
      })
      if (!chapter) throw new BadRequestException('Chapter not found')

      const existed = await this.quizRepo.findQuizByChapter(chapterId)
      if (existed) throw new BadRequestException('Chapter already has a quiz')
    }

    return this.quizRepo.createQuiz({
      type,
      lessonId,
      chapterId,
      title,
      description,
    })
  }

  async createQuizForLesson(lessonId: string, data: { title?: string; description?: string }) {
    const existed = await this.quizRepo.findQuizByLesson(lessonId)
    if (existed) throw new BadRequestException('Lesson already has a quiz')

    return this.quizRepo.createQuiz({
      type: 'LESSON',
      lessonId,
      title: data.title,
      description: data.description,
    })
  }

  async createQuizWithQuestionsForLesson(
    lessonId: string,
    data: {
      title?: string
      description?: string
      questions: { content: string; answers: { content: string; isCorrect: boolean }[] }[]
    },
  ) {
    const existed = await this.quizRepo.findQuizByLesson(lessonId)
    if (existed) throw new BadRequestException('Lesson already has a quiz')

    return this.quizRepo.createQuizWithQuestions({
      type: 'LESSON',
      lessonId,
      title: data.title,
      description: data.description,
      questions: data.questions,
    })
  }

  async updateQuiz(quizId: string, body: UpdateQuizBodyType) {
    const quiz = await this.quizRepo.findQuizById(quizId)
    if (!quiz) throw new QuizNotFoundException()

    return this.quizRepo.updateQuiz({
      where: { id: quizId },
      data: body,
    })
  }

  async deleteQuiz(quizId: string) {
    const quiz = await this.quizRepo.findQuizById(quizId)
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

  async getQuizByChapter(chapterId: string) {
    const quiz = await this.quizRepo.findQuizByChapter(chapterId)
    if (!quiz) throw new QuizNotFoundException()

    return quiz
  }

  // ================= QUESTION =================

  async addQuestion(body: AddQuestionBodyType) {
    const { quizId, content, answers } = body

    const quiz = await this.quizRepo.findQuizById(quizId)
    if (!quiz) throw new QuizNotFoundException()

    if (!answers || answers.length < 2) {
      throw new BadRequestException('At least 2 answers required')
    }

    const correctCount = answers.filter((a) => a.isCorrect).length
    if (correctCount !== 1) {
      throw new BadRequestException('Must have exactly 1 correct answer')
    }

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
      data: {
        content: body.content,
      },
    })
  }

  async deleteQuestion(questionId: string) {
    const question = await this.quizRepo.findQuestion({ id: questionId })
    if (!question) throw new QuestionNotFoundException()

    await this.quizRepo.deleteQuestion({ id: questionId })

    return { message: 'Question deleted successfully' }
  }

  // ================= SUBMIT =================

  async submitQuiz(userId: string, body: SubmitQuizBodyType) {
    const { quizId, answers } = body

    if (!userId) throw new BadRequestException('Unauthorized')

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

    const total = quiz.questions.length
    const score = total > 0 ? (correct / total) * 100 : 0

    return {
      totalQuestions: total,
      correctAnswers: correct,
      score,
    }
  }
}
