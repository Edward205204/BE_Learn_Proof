import { BadRequestException, ConflictException } from '@nestjs/common'
import { QuizDraftStatus } from 'src/generated/prisma/enums'
import { QuizCmsService } from './quiz-cms.service'
import type { AiQuizQuestionReviewType } from './quiz.model'

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}))

type MockRepo = Record<string, jest.Mock>

const USER_ID = 'user-1'
const LESSON_ID = 'lesson-1'
const DRAFT_ID = 'draft-1'

const ownerLesson = {
  chapter: {
    course: {
      creatorId: USER_ID,
    },
  },
}

const question = (id: string, extra: Partial<AiQuizQuestionReviewType> = {}): AiQuizQuestionReviewType => ({
  question: `Cau hoi ${id} co noi dung du dai?`,
  options: [`${id}-A`, `${id}-B`, `${id}-C`, `${id}-D`],
  correctIndex: 0,
  explanation: `Giai thich ${id}`,
  ...extra,
})

const draft = (
  questions: AiQuizQuestionReviewType[],
  extra: Partial<{
    id: string
    lessonId: string
    status: QuizDraftStatus
    validatedOutput: unknown
    rawOutput: unknown
  }> = {},
) => ({
  id: DRAFT_ID,
  lessonId: LESSON_ID,
  status: QuizDraftStatus.DRAFT_AI,
  validatedOutput: { questions },
  rawOutput: null,
  ...extra,
})

const createRepo = (): MockRepo => ({
  appendSingleQuestionToQuiz: jest.fn(),
  createAiJob: jest.fn(),
  findDraftAiJobForLesson: jest.fn(),
  findDraftById: jest.fn(),
  findDraftQuizForLesson: jest.fn(),
  findDraftsByLessonId: jest.fn(),
  findLessonOwner: jest.fn(),
  findQuizByLessonId: jest.fn(),
  findQuizIdByLessonId: jest.fn(),
  updateAiJobStatus: jest.fn(),
  updateDraftStatus: jest.fn(),
  updateDraftValidatedOutput: jest.fn(),
})

describe('QuizCmsService AI draft review', () => {
  let repo: MockRepo
  let service: QuizCmsService
  let queue: { add: jest.Mock }

  beforeEach(() => {
    repo = createRepo()
    queue = { add: jest.fn().mockResolvedValue(undefined) }

    repo.findLessonOwner.mockResolvedValue(ownerLesson)
    repo.findQuizByLessonId.mockResolvedValue(null)
    repo.findDraftAiJobForLesson.mockResolvedValue(null)
    repo.updateDraftValidatedOutput.mockResolvedValue(undefined)
    repo.updateDraftStatus.mockResolvedValue(undefined)

    service = new QuizCmsService(repo as any, queue as any)
  })

  it('accepts one pending question, appends it to the real quiz, and persists only remaining draft questions', async () => {
    const first = question('1')
    const second = question('2')
    repo.findDraftById.mockResolvedValue(draft([first, second]))
    repo.appendSingleQuestionToQuiz.mockResolvedValue({ quizId: 'quiz-1', questionId: 'live-1' })

    const result = await service.acceptDraftQuestion(DRAFT_ID, USER_ID, 0)

    expect(repo.appendSingleQuestionToQuiz).toHaveBeenCalledWith(LESSON_ID, first)
    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [second])
    expect(repo.updateDraftStatus).not.toHaveBeenCalled()
    expect(result).toEqual({
      quizId: 'quiz-1',
      questionId: 'live-1',
      alreadySynced: false,
      remainingQuestions: [second],
      draftStatus: QuizDraftStatus.DRAFT_AI,
    })
  })

  it('accepts the last pending question and closes the draft as published', async () => {
    const onlyQuestion = question('1')
    repo.findDraftById.mockResolvedValue(draft([onlyQuestion]))
    repo.appendSingleQuestionToQuiz.mockResolvedValue({ quizId: 'quiz-1', questionId: 'live-1' })

    const result = await service.acceptDraftQuestion(DRAFT_ID, USER_ID, 0)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.PUBLISHED, { reviewerId: USER_ID })
    expect(result.remainingQuestions).toEqual([])
    expect(result.draftStatus).toBe(QuizDraftStatus.PUBLISHED)
  })

  it('accepts consecutive visible boundary questions by repeatedly using index 0 after removal', async () => {
    const first = question('1')
    const second = question('2')
    let storedDraft = draft([first, second])

    repo.findDraftById.mockImplementation(() => storedDraft)
    repo.updateDraftValidatedOutput.mockImplementation(
      (_draftId: string, nextQuestions: AiQuizQuestionReviewType[]) => {
        storedDraft = {
          ...storedDraft,
          validatedOutput: { questions: nextQuestions },
        }
      },
    )
    repo.updateDraftStatus.mockImplementation((_draftId: string, status: QuizDraftStatus) => {
      storedDraft = {
        ...storedDraft,
        status,
      }
    })
    repo.appendSingleQuestionToQuiz
      .mockResolvedValueOnce({ quizId: 'quiz-1', questionId: 'live-1' })
      .mockResolvedValueOnce({ quizId: 'quiz-1', questionId: 'live-2' })

    const firstResult = await service.acceptDraftQuestion(DRAFT_ID, USER_ID, 0)
    const secondResult = await service.acceptDraftQuestion(DRAFT_ID, USER_ID, 0)

    expect(firstResult).toMatchObject({
      questionId: 'live-1',
      remainingQuestions: [second],
      draftStatus: QuizDraftStatus.DRAFT_AI,
    })
    expect(secondResult).toMatchObject({
      questionId: 'live-2',
      remainingQuestions: [],
      draftStatus: QuizDraftStatus.PUBLISHED,
    })
    expect(repo.appendSingleQuestionToQuiz).toHaveBeenNthCalledWith(1, LESSON_ID, first)
    expect(repo.appendSingleQuestionToQuiz).toHaveBeenNthCalledWith(2, LESSON_ID, second)
    expect(storedDraft).toMatchObject({
      status: QuizDraftStatus.PUBLISHED,
      validatedOutput: { questions: [] },
    })
  })

  it('accepts the visible pending question by fingerprint when the submitted index is out of range', async () => {
    const acceptedBefore = question('accepted-before', { reviewStatus: 'ACCEPTED' })
    const visiblePending = question('visible-pending')
    repo.findDraftById.mockResolvedValue(draft([acceptedBefore, visiblePending]))
    repo.appendSingleQuestionToQuiz.mockResolvedValue({ quizId: 'quiz-1', questionId: 'live-visible' })

    const result = await service.acceptDraftQuestion(DRAFT_ID, USER_ID, 1, visiblePending)

    expect(repo.appendSingleQuestionToQuiz).toHaveBeenCalledWith(LESSON_ID, visiblePending)
    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.PUBLISHED, { reviewerId: USER_ID })
    expect(result).toMatchObject({
      questionId: 'live-visible',
      remainingQuestions: [],
      draftStatus: QuizDraftStatus.PUBLISHED,
    })
  })

  it('rejects the visible pending question by fingerprint when the submitted index is out of range', async () => {
    const acceptedBefore = question('accepted-before', { reviewStatus: 'ACCEPTED' })
    const visiblePending = question('visible-pending')
    repo.findDraftById.mockResolvedValue(draft([acceptedBefore, visiblePending]))

    const result = await service.rejectDraftQuestion(DRAFT_ID, USER_ID, 1, visiblePending)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.REJECTED, { reviewerId: USER_ID })
    expect(result).toEqual({
      remainingQuestions: [],
      draftStatus: QuizDraftStatus.REJECTED,
    })
  })

  it('rejects the last pending question and closes the draft as rejected', async () => {
    const onlyQuestion = question('1')
    repo.findDraftById.mockResolvedValue(draft([onlyQuestion]))

    const result = await service.rejectDraftQuestion(DRAFT_ID, USER_ID, 0)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.REJECTED, { reviewerId: USER_ID })
    expect(result).toEqual({
      remainingQuestions: [],
      draftStatus: QuizDraftStatus.REJECTED,
    })
  })

  it('sanitizes overview drafts by removing accepted, rejected, and already-synced edge items', async () => {
    const staleStart = question('stale-start', { quizQuestionId: 'live-start' })
    const pendingMiddle = question('pending-middle')
    const acceptedEnd = question('accepted-end', { reviewStatus: 'ACCEPTED' })
    const rejectedEnd = question('rejected-end', { reviewStatus: 'REJECTED' })
    const inputDraft = draft([staleStart, pendingMiddle, acceptedEnd, rejectedEnd])
    repo.findDraftsByLessonId.mockResolvedValue([inputDraft])

    const overview = await service.getLessonQuizOverview(LESSON_ID, USER_ID)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [pendingMiddle])
    expect(repo.updateDraftStatus).not.toHaveBeenCalled()
    expect(overview.drafts[0]).toMatchObject({
      status: QuizDraftStatus.DRAFT_AI,
      validatedOutput: { questions: [pendingMiddle] },
    })
  })

  it('sanitizes an active draft with no pending questions into published state on overview reload', async () => {
    const alreadySynced = question('synced', { quizQuestionId: 'live-1' })
    const accepted = question('accepted', { reviewStatus: 'ACCEPTED' })
    const rejected = question('rejected', { reviewStatus: 'REJECTED' })
    repo.findDraftsByLessonId.mockResolvedValue([draft([alreadySynced, accepted, rejected])])

    const overview = await service.getLessonQuizOverview(LESSON_ID, USER_ID)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.PUBLISHED, { reviewerId: USER_ID })
    expect(overview.drafts[0]).toMatchObject({
      status: QuizDraftStatus.PUBLISHED,
      validatedOutput: { questions: [] },
    })
  })

  it('does not resurrect rawOutput when validatedOutput is already empty', async () => {
    const rawPending = question('raw')
    repo.findDraftsByLessonId.mockResolvedValue([
      draft([], {
        validatedOutput: { questions: [] },
        rawOutput: { questions: [rawPending] },
      }),
    ])

    const overview = await service.getLessonQuizOverview(LESSON_ID, USER_ID)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.PUBLISHED, { reviewerId: USER_ID })
    expect(overview.drafts[0].validatedOutput).toEqual({ questions: [] })
  })

  it('cleans up a stale accept click when no pending draft question exists', async () => {
    repo.findDraftById.mockResolvedValue(
      draft([question('synced', { quizQuestionId: 'live-1' }), question('accepted', { reviewStatus: 'ACCEPTED' })]),
    )

    await expect(service.acceptDraftQuestion(DRAFT_ID, USER_ID, 0)).rejects.toBeInstanceOf(BadRequestException)

    expect(repo.appendSingleQuestionToQuiz).not.toHaveBeenCalled()
    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.PUBLISHED, { reviewerId: USER_ID })
  })

  it('cleans up a stale reject click when no pending draft question exists', async () => {
    repo.findDraftById.mockResolvedValue(
      draft([question('synced', { quizQuestionId: 'live-1' }), question('rejected', { reviewStatus: 'REJECTED' })]),
    )

    await expect(service.rejectDraftQuestion(DRAFT_ID, USER_ID, 0)).rejects.toBeInstanceOf(BadRequestException)

    expect(repo.updateDraftValidatedOutput).toHaveBeenCalledWith(DRAFT_ID, [])
    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.REJECTED, { reviewerId: USER_ID })
  })

  it('does not block generation with a stale empty DRAFT_AI draft', async () => {
    repo.findDraftQuizForLesson.mockResolvedValue(draft([question('synced', { quizQuestionId: 'live-1' })]))
    repo.createAiJob.mockResolvedValue({ id: 'job-1' })

    const result = await service.generateAiQuiz(LESSON_ID, USER_ID, 'vi')

    expect(repo.updateDraftStatus).toHaveBeenCalledWith(DRAFT_ID, QuizDraftStatus.PUBLISHED, { reviewerId: USER_ID })
    expect(repo.createAiJob).toHaveBeenCalledWith({
      lessonId: LESSON_ID,
      requestedBy: USER_ID,
      type: 'QUIZ_GENERATION',
    })
    expect(queue.add).toHaveBeenCalled()
    expect(result).toEqual({ jobId: 'job-1' })
  })

  it('still blocks generation when a real pending DRAFT_AI draft exists', async () => {
    repo.findDraftQuizForLesson.mockResolvedValue(draft([question('pending')]))

    await expect(service.generateAiQuiz(LESSON_ID, USER_ID, 'vi')).rejects.toBeInstanceOf(ConflictException)

    expect(repo.createAiJob).not.toHaveBeenCalled()
    expect(queue.add).not.toHaveBeenCalled()
  })
})
