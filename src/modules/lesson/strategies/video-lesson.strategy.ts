import { Injectable } from '@nestjs/common'
import { LessonStrategy } from './lesson.strategy.interface'
import { LessonRepo } from '../lesson.repo'
import { CreateLessonBodyType, LessonProvider, LessonType } from '../lesson.model'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { Transactional } from '@nestjs-cls/transactional'

@Injectable()
export class VideoLessonStrategy implements LessonStrategy {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly baseLessonStrategy: BaseLessonStrategy,
    private readonly quizService: QuizCmsService,
  ) {}

  private readonly YOUTUBE_URL_REGEX =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  private readonly YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

  private extractYoutubeId(videoId?: string): string | null {
    if (!videoId) return null
    const match = videoId.match(this.YOUTUBE_URL_REGEX)
    const idToValidate = match ? match[1] : videoId

    return this.YOUTUBE_ID_REGEX.test(idToValidate) ? idToValidate : videoId
  }

  @Transactional()
  async create(data: CreateLessonBodyType) {
    const order = await this.baseLessonStrategy.getNextOrder(data.chapterId)
    let provider = LessonProvider.BUNNY // default

    const youtubeId = this.extractYoutubeId(data?.videoId)

    if (youtubeId) {
      provider = LessonProvider.YOUTUBE
    }
    // ko thể undefined vì đã được định nghĩa trong hàm refine() zod
    const videoId = youtubeId ?? (data?.videoId as string)

    const lesson = await this.lessonRepo.createLesson({
      type: LessonType.VIDEO,
      title: data.title,
      shortDesc: data?.shortDesc ?? null,
      fullDesc: data?.fullDesc ?? null,
      order: order,
      videoId,
      provider: provider,
      duration: data?.duration || 0,
      chapterId: data.chapterId,
      textContent: null,
    })

    if (data?.quizData) {
      await this.quizService.createQuiz({ lessonId: lesson.id, quizData: data.quizData })
    }

    return lesson
  }
}
