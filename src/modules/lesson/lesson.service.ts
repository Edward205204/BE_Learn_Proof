import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common'
import { CreateLessonBodyType, LessonTypeEnum, VideoProviderEnumTS } from './lesson.model'
import { LessonRepo } from './lesson.repo'
import { QuizService } from '../quiz/quiz.service'

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly quizService: QuizService,
  ) {}

  async createLesson(body: CreateLessonBodyType, userId: string) {
    const { type, chapterId } = body

    await this.validateChapterAuthor(chapterId, userId)
    const order = await this.getNextOrder(chapterId)

    switch (type) {
      case LessonTypeEnum.enum.VIDEO:
        return this.createVideoLesson(body, order, userId)
      case LessonTypeEnum.enum.TEXT:
        return this.createTextLesson(body, order, userId)
      case LessonTypeEnum.enum.QUIZ:
        throw new NotImplementedException('Quiz lesson is not supported yet')
    }
  }

  private async validateChapterAuthor(chapterId: string, userId: string) {
    const chapter = await this.lessonRepo.findChapterWithAuthorId({
      id: chapterId,
      authorId: userId,
    })
    if (!chapter) {
      throw new BadRequestException('Chapter not found or you are not the author of this chapter')
    }
    return chapter
  }

  private async getNextOrder(chapterId: string) {
    const lastOrder = await this.lessonRepo.getLastLessonOrder(chapterId)
    return lastOrder + 1
  }

  private async createVideoLesson(body: CreateLessonBodyType, order: number, userId: string) {
    const { title, shortDesc, fullDesc, chapterId, videoId, provider, duration, quizData } = body
    const resolvedVideoId = this.extractYoutubeId(provider ?? 'YOUTUBE', videoId)

    const lesson = await this.lessonRepo.createLesson({
      type: 'VIDEO',
      title,
      shortDesc: shortDesc ?? null,
      fullDesc: fullDesc ?? null,
      order,
      videoId: resolvedVideoId,
      provider: provider ?? null,
      duration: duration ?? null,
      chapterId,
      textContent: null,
    })

    return this.withOptionalQuiz(lesson, quizData, userId)
  }

  private async createTextLesson(body: CreateLessonBodyType, order: number, userId: string) {
    const { title, shortDesc, fullDesc, chapterId, textContent, quizData } = body

    const lesson = await this.lessonRepo.createLesson({
      type: 'TEXT',
      title,
      shortDesc: shortDesc ?? null,
      fullDesc: fullDesc ?? null,
      order,
      videoId: null,
      provider: null,
      duration: null,
      chapterId,
      textContent: textContent ?? null,
    })

    return this.withOptionalQuiz(lesson, quizData, userId)
  }

  private async withOptionalQuiz<T>(
    lesson: T,
    quizData: { title?: string; description?: string } | undefined,
    userId: string,
  ) {
    if (!quizData) return { lesson, quizWarning: null }

    try {
      await this.quizService.createQuiz(
        {
          type: 'LESSON',
          lessonId: (lesson as { id: string }).id,
          title: quizData.title,
          description: quizData.description,
        },
        userId,
      )
      return { lesson, quizWarning: null }
    } catch {
      return {
        lesson,
        quizWarning: 'Tạo bài học thành công nhưng quá trình sử lý quiz có vấn đề, bạn có thể thêm lại sau',
      }
    }
  }

  private extractYoutubeId(provider: VideoProviderEnumTS, videoId?: string): string | null {
    if (!videoId) return null
    if (provider !== 'YOUTUBE') return videoId

    const match = videoId.match(YOUTUBE_URL_REGEX)
    const idToValidate = match ? match[1] : videoId

    return YOUTUBE_ID_REGEX.test(idToValidate) ? idToValidate : videoId
  }
}
