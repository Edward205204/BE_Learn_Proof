import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { QuizRepo } from './quiz.repo'
import { CreateQuizType, QuestionType, AiQuizQuestionReviewType, AiQuizQuestionType } from './quiz.model'
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

  async createEmptyQuiz(lessonId: string) {
    return this.quizRepo.createEmptyQuiz(lessonId)
  }

  private getDraftQuestions(draft: { validatedOutput: unknown; rawOutput: unknown }) {
    const payload = draft.validatedOutput ?? draft.rawOutput
    const filterPending = (questions: AiQuizQuestionReviewType[]) =>
      questions.filter(
        (question) => !question.quizQuestionId && (!question.reviewStatus || question.reviewStatus === 'PENDING'),
      )

    if (Array.isArray(payload)) return filterPending(payload as AiQuizQuestionReviewType[])
    if (typeof payload === 'object' && payload && 'questions' in payload) {
      const questions = (payload as { questions?: AiQuizQuestionReviewType[] }).questions
      return Array.isArray(questions) ? filterPending(questions) : []
    }
    return []
  }

  private async persistRemainingDraftQuestions(
    draftId: string,
    questions: AiQuizQuestionReviewType[],
    emptyStatus: QuizDraftStatus,
    userId: string,
  ) {
    await this.quizRepo.updateDraftValidatedOutput(draftId, questions)

    if (questions.length === 0) {
      await this.quizRepo.updateDraftStatus(draftId, emptyStatus, { reviewerId: userId })
    }
  }

  private isDraftQuestionPayload(body: unknown): body is AiQuizQuestionType {
    if (!body || typeof body !== 'object') return false
    const candidate = body as Partial<AiQuizQuestionType>

    return (
      typeof candidate.question === 'string' &&
      Array.isArray(candidate.options) &&
      candidate.options.every((option) => typeof option === 'string') &&
      typeof candidate.correctIndex === 'number' &&
      typeof candidate.explanation === 'string'
    )
  }

  private findDraftQuestionIndex(questions: AiQuizQuestionReviewType[], questionIndex: number, body?: unknown) {
    if (!this.isDraftQuestionPayload(body)) return questionIndex

    const matchedIndex = questions.findIndex(
      (question) =>
        question.question === body.question &&
        question.correctIndex === body.correctIndex &&
        question.explanation === body.explanation &&
        question.options.length === body.options.length &&
        question.options.every((option, index) => option === body.options[index]),
    )

    return matchedIndex >= 0 ? matchedIndex : questionIndex
  }

  private async sanitizeDraftForReview<
    T extends { id: string; status: QuizDraftStatus; validatedOutput: unknown; rawOutput: unknown },
  >(draft: T, userId?: string) {
    if (draft.status !== QuizDraftStatus.DRAFT_AI) return draft

    const questions = this.getDraftQuestions(draft)
    const nextStatus = questions.length === 0 ? QuizDraftStatus.PUBLISHED : QuizDraftStatus.DRAFT_AI

    await this.quizRepo.updateDraftValidatedOutput(draft.id, questions)

    if (nextStatus !== draft.status) {
      await this.quizRepo.updateDraftStatus(draft.id, nextStatus, userId ? { reviewerId: userId } : undefined)
    }

    return {
      ...draft,
      status: nextStatus,
      validatedOutput: { questions },
    }
  }

  private async sanitizeDraftsForReview<
    T extends { id: string; status: QuizDraftStatus; validatedOutput: unknown; rawOutput: unknown },
  >(drafts: T[], userId?: string) {
    return Promise.all(drafts.map((draft) => this.sanitizeDraftForReview(draft, userId)))
  }

  async addQuestionForQuiz(quizId: string, questionData: QuestionType, userId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.createQuestion(quizId, questionData)
  }

  async addAnswerForQuestion(questionId: string, content: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.createAnswer(questionId, content)
  }

  getQuizByLessonId(lessonId: string) {
    return this.quizRepo.findQuizByLessonId(lessonId)
  }

  async deleteQuestionFromQuiz(questionId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.deleteQuestions(questionId)
  }

  async deleteQuiz(quizId: string, userId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.deleteQuiz(quizId)
  }

  async deleteAnswer(questionId: string, answerId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.deleteAnswers(questionId, answerId)
  }

  async editQuestion(questionId: string, content: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.updateContentOfQuestion(questionId, content)
  }

  async editAnswer(answerId: string, questionId: string, content: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
    return this.quizRepo.updateAnswer(answerId, questionId, content)
  }

  @Transactional()
  async chooseCorrectAnswer(questionId: string, answerId: string, userId: string, quizId: string) {
    await this.requireQuizOwner(quizId, userId)
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
      const sanitizedDraft = await this.sanitizeDraftForReview(existingDraftAi, userId)
      if (sanitizedDraft.status === QuizDraftStatus.DRAFT_AI) {
        throw new ConflictException('Đã tồn tại một bản nháp AI cho lesson này.')
      }
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
        `quiz_gen_${lessonId}`,
        {
          lessonId,
          aiJobId: aiJob.id,
          requestedBy: userId,
          language,
        },
        {
          jobId: `quizgen_${lessonId}_${aiJob.id}`,
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
    const drafts = await this.quizRepo.findDraftsByLessonId(lessonId)
    return this.sanitizeDraftsForReview(drafts, userId)
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
    const sanitizedDrafts = await this.sanitizeDraftsForReview(drafts, userId)

    return {
      lessonId,
      quiz,
      drafts: sanitizedDrafts,
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

    const questions = this.getDraftQuestions(draft)

    for (const question of questions) {
      if (!question.quizQuestionId) {
        await this.quizRepo.appendSingleQuestionToQuiz(draft.lessonId, question)
      }
    }

    await this.quizRepo.updateDraftValidatedOutput(draftId, [])
    await this.quizRepo.updateDraftStatus(draftId, QuizDraftStatus.PUBLISHED, { reviewerId: userId })

    return true
  }

  @Transactional()
  async acceptDraftQuestion(draftId: string, userId: string, questionIndex: number, body?: unknown) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được review')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    const questions = this.getDraftQuestions(draft)
    const resolvedQuestionIndex = this.findDraftQuestionIndex(questions, questionIndex, body)
    const question = questions[resolvedQuestionIndex]
    if (!question) {
      await this.persistRemainingDraftQuestions(draftId, questions, QuizDraftStatus.PUBLISHED, userId)
      throw new BadRequestException('Câu hỏi không tồn tại trong bản nháp')
    }

    const nextQuestions: AiQuizQuestionReviewType[] = questions.filter((_, index) => index !== resolvedQuestionIndex)

    if (question.quizQuestionId) {
      const existingQuiz = await this.quizRepo.findQuizIdByLessonId(draft.lessonId)
      await this.persistRemainingDraftQuestions(draftId, nextQuestions, QuizDraftStatus.PUBLISHED, userId)
      return {
        quizId: existingQuiz?.id ?? null,
        questionId: question.quizQuestionId,
        alreadySynced: true,
        remainingQuestions: nextQuestions,
        draftStatus: nextQuestions.length === 0 ? QuizDraftStatus.PUBLISHED : QuizDraftStatus.DRAFT_AI,
      }
    }

    const created = await this.quizRepo.appendSingleQuestionToQuiz(draft.lessonId, question)
    await this.persistRemainingDraftQuestions(draftId, nextQuestions, QuizDraftStatus.PUBLISHED, userId)

    return {
      quizId: created.quizId,
      questionId: created.questionId,
      alreadySynced: false,
      remainingQuestions: nextQuestions,
      draftStatus: nextQuestions.length === 0 ? QuizDraftStatus.PUBLISHED : QuizDraftStatus.DRAFT_AI,
    }
  }

  @Transactional()
  async rejectDraftQuestion(draftId: string, userId: string, questionIndex: number, body?: unknown) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được review')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    const questions = this.getDraftQuestions(draft)
    const resolvedQuestionIndex = this.findDraftQuestionIndex(questions, questionIndex, body)
    const question = questions[resolvedQuestionIndex]
    if (!question) {
      await this.persistRemainingDraftQuestions(draftId, questions, QuizDraftStatus.REJECTED, userId)
      throw new BadRequestException('Câu hỏi không tồn tại trong bản nháp')
    }

    const nextQuestions: AiQuizQuestionReviewType[] = questions.filter((_, index) => index !== resolvedQuestionIndex)

    await this.persistRemainingDraftQuestions(draftId, nextQuestions, QuizDraftStatus.REJECTED, userId)

    return {
      remainingQuestions: nextQuestions,
      draftStatus: nextQuestions.length === 0 ? QuizDraftStatus.REJECTED : QuizDraftStatus.DRAFT_AI,
    }
  }

  @Transactional()
  async updateDraftQuestion(draftId: string, userId: string, questionIndex: number, body: AiQuizQuestionType) {
    const draft = await this.quizRepo.findDraftById(draftId)
    if (!draft) throw new NotFoundException('Bản nháp không tồn tại')
    if (draft.status !== QuizDraftStatus.DRAFT_AI) {
      throw new BadRequestException('Chỉ bản nháp DRAFT_AI mới có thể được chỉnh sửa')
    }

    await this.requireLessonOwner(draft.lessonId, userId)

    const questions = this.getDraftQuestions(draft)
    const question = questions[questionIndex]
    if (!question) {
      throw new BadRequestException('Câu hỏi không tồn tại trong bản nháp')
    }

    const nextQuestions: AiQuizQuestionReviewType[] = questions.map((item, index) =>
      index === questionIndex
        ? {
            ...item,
            question: body.question,
            options: body.options,
            correctIndex: body.correctIndex,
            explanation: body.explanation,
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
