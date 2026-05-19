import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { CreateQuizType, QuestionType, AiQuizQuestionReviewType } from './quiz.model'
import { AiJobStatus, AiJobType, QuizDraftStatus } from 'src/generated/prisma/enums'
import type { AiOutputLanguage } from 'src/modules/ai/prompt-template.service'
import {
  QuestionHasMultipleCorrectAnswersException,
  QuestionMissingCorrectAnswerException,
  QuestionNotFoundException,
  QuestionNotInEditModeException,
} from './quiz.error'
import { Transactional } from '@nestjs-cls/transactional'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class QuizCmsService {
  constructor(
    private readonly quizRepo: QuizRepo,
    @InjectQueue('quiz-generation') private quizQueue: Queue,
  ) {}

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

  private getDraftQuestions(draft: { validatedOutput: unknown; rawOutput: unknown }) {
    const payload = draft.validatedOutput ?? draft.rawOutput
    if (Array.isArray(payload)) return payload as AiQuizQuestionReviewType[]
    if (typeof payload === 'object' && payload && 'questions' in payload) {
      const questions = (payload as { questions?: AiQuizQuestionReviewType[] }).questions
      return Array.isArray(questions) ? questions : []
    }
    return []
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

  // --- AI Quiz Draft ---

  private async requireLessonOwner(lessonId: string, userId: string) {
    const lesson = await this.quizRepo.findLessonOwner(lessonId)
    if (!lesson) throw new NotFoundException('Lesson không tồn tại')
    const creatorId = lesson.chapter?.course?.creatorId
    if (creatorId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác trên lesson này')
  }

  async generateAiQuiz(lessonId: string, userId: string, language: AiOutputLanguage = 'vi') {
    await this.requireLessonOwner(lessonId, userId)

    const existingDraftAi = await this.quizRepo.findDraftQuizForLesson(lessonId)
    if (existingDraftAi) {
      throw new ConflictException('Đã tồn tại một bản nháp AI cho lesson này.')
    }

    const activeJob = await this.quizRepo.findDraftAiJobForLesson(lessonId)
    if (activeJob) {
      throw new ConflictException('Đã có yêu cầu sinh quiz đang được xử lý cho lesson này.')
    }

    const aiJob = await this.quizRepo.createAiJob({
      lessonId,
      requestedBy: userId,
      type: AiJobType.QUIZ_GENERATION,
    })

    try {
      await this.quizQueue.add(
        `quiz-gen:${lessonId}`,
        {
          lessonId,
          aiJobId: aiJob.id,
          requestedBy: userId,
          language,
        },
        {
          jobId: `quizgen:${lessonId}:${aiJob.id}`,
          attempts: 3,
        },
      )
    } catch (error: any) {
      await this.quizRepo.updateAiJobStatus(aiJob.id, AiJobStatus.FAILED, {
        error: error?.message || 'Failed to enqueue quiz generation job',
      })
      throw error
    }

    return { jobId: aiJob.id }
  }

  async getDraftsByLesson(lessonId: string, userId: string) {
    await this.requireLessonOwner(lessonId, userId)
    return this.quizRepo.findDraftsByLessonId(lessonId)
  }

  async getDraftById(draftId: string, userId: string) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    await this.requireLessonOwner(draft.lessonId, userId)
    return draft
  }

  async getLessonQuizOverview(lessonId: string, userId: string) {
    await this.requireLessonOwner(lessonId, userId)

    const [quiz, drafts, activeJob] = await Promise.all([
      this.quizRepo.findQuizByLessonId(lessonId),
      this.quizRepo.findDraftsByLessonId(lessonId),
      this.quizRepo.findDraftAiJobForLesson(lessonId),
    ])

    return {
      lessonId,
      quiz,
      drafts,
      activeJob,
    }
  }

  @Transactional()
  async publishDraft(draftId: string, userId: string) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được publish')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    const output = this.getDraftQuestions(draft)
    const syncedQuestions: AiQuizQuestionReviewType[] = []

    for (const question of output) {
      if (question.reviewStatus === 'REJECTED') {
        syncedQuestions.push(question)
        continue
      }

      if (question.quizQuestionId) {
        syncedQuestions.push({
          ...question,
          reviewStatus: question.reviewStatus ?? 'ACCEPTED',
        })
        continue
      }

      const created = await this.quizRepo.appendSingleQuestionToQuiz(draft.lessonId, question)
      syncedQuestions.push({
        ...question,
        reviewStatus: 'ACCEPTED',
        quizQuestionId: created.questionId,
        reviewedAt: new Date().toISOString(),
      })
    }

    if (syncedQuestions.length > 0) {
      await this.quizRepo.updateDraftValidatedOutput(draftId, syncedQuestions)
    }

    await this.quizRepo.updateDraftStatus(draftId, QuizDraftStatus.PUBLISHED, { reviewerId: userId })

    return true
  }

  @Transactional()
  async acceptDraftQuestion(draftId: string, userId: string, questionIndex: number) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được review')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    const questions = this.getDraftQuestions(draft)
    const question = questions[questionIndex]
    if (!question) {
      throw new BadRequestException('Câu hỏi không tồn tại trong bản nháp')
    }
    if (question.reviewStatus && question.reviewStatus !== 'PENDING') {
      throw new BadRequestException('Câu hỏi này đã được review')
    }

    if (question.quizQuestionId) {
      const existingQuiz = await this.quizRepo.findQuizIdByLessonId(draft.lessonId)
      const nextQuestions: AiQuizQuestionReviewType[] = questions.map((item, index) =>
        index === questionIndex
          ? {
              ...item,
              reviewStatus: 'ACCEPTED' as const,
              reviewedAt: new Date().toISOString(),
            }
          : item,
      )
      await this.quizRepo.updateDraftValidatedOutput(draftId, nextQuestions)
      return {
        quizId: existingQuiz?.id ?? null,
        questionId: question.quizQuestionId,
        alreadySynced: true,
      }
    }

    const created = await this.quizRepo.appendSingleQuestionToQuiz(draft.lessonId, question)
    const nextQuestions: AiQuizQuestionReviewType[] = questions.map((item, index) =>
      index === questionIndex
        ? {
            ...item,
            reviewStatus: 'ACCEPTED' as const,
            quizQuestionId: created.questionId,
            reviewedAt: new Date().toISOString(),
          }
        : item,
    )
    await this.quizRepo.updateDraftValidatedOutput(draftId, nextQuestions)

    return {
      quizId: created.quizId,
      questionId: created.questionId,
      alreadySynced: false,
    }
  }

  @Transactional()
  async rejectDraftQuestion(draftId: string, userId: string, questionIndex: number) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được review')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    const questions = this.getDraftQuestions(draft)
    const question = questions[questionIndex]
    if (!question) {
      throw new BadRequestException('Câu hỏi không tồn tại trong bản nháp')
    }
    if (question.reviewStatus && question.reviewStatus !== 'PENDING') {
      throw new BadRequestException('Câu hỏi này đã được review')
    }

    const nextQuestions: AiQuizQuestionReviewType[] = questions.map((item, index) =>
      index === questionIndex
        ? {
            ...item,
            reviewStatus: 'REJECTED' as const,
            reviewedAt: new Date().toISOString(),
            quizQuestionId: null,
          }
        : item,
    )

    await this.quizRepo.updateDraftValidatedOutput(draftId, nextQuestions)

    return true
  }

  @Transactional()
  async rejectDraft(draftId: string, userId: string, reviewNote?: string) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được reject')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    await this.quizRepo.updateDraftStatus(draftId, QuizDraftStatus.REJECTED, { reviewerId: userId, reviewNote })

    return true
  }
}
