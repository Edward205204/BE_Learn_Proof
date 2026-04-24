import { Injectable } from '@nestjs/common'
import { LessonStrategy } from './lesson.strategy.interface'
import { LessonRepo } from '../lesson.repo'
import { CreateLessonBodyType, LessonProvider, LessonType } from '../lesson.model'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { Transactional } from '@nestjs-cls/transactional'
import { LessonDetailRaw, VideoLessonDetailResponse } from '../lesson.response'

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
    const sanitizedVideoId = videoId.trim()
    const match = sanitizedVideoId.match(this.YOUTUBE_URL_REGEX)

    if (match?.[1] && this.YOUTUBE_ID_REGEX.test(match[1])) {
      return match[1]
    }

    if (this.YOUTUBE_ID_REGEX.test(sanitizedVideoId)) {
      return sanitizedVideoId
    }

    return null
  }

  @Transactional()
  async create(data: CreateLessonBodyType) {
    const order = await this.baseLessonStrategy.getNextOrder(data.chapterId)
    let provider = LessonProvider.CLOUDINARY // default

    const inputVideoId = (data?.videoId as string).trim()
    const youtubeId = this.extractYoutubeId(inputVideoId)
    const videoKey = data?.videoKey?.trim() || null

    if (youtubeId) {
      provider = LessonProvider.YOUTUBE
    }
    // ko thể undefined vì đã được định nghĩa trong hàm refine() zod
    const videoId = youtubeId ?? inputVideoId

    const lesson = await this.lessonRepo.createLesson({
      type: LessonType.VIDEO,
      title: data.title,
      shortDesc: data?.shortDesc ?? null,
      order: order,
      videoId,
      provider: provider,
      duration: data?.duration || 0,
      chapterId: data.chapterId,
      textContent: null,
      videoKey: youtubeId ? null : videoKey,
    })

    if (data?.quizData) {
      await this.quizService.createQuiz({ lessonId: lesson.id, quizData: data.quizData })
    }

    return lesson
  }

  get(lesson: LessonDetailRaw): Promise<VideoLessonDetailResponse> {
    return Promise.resolve({
      id: lesson.id,
      title: lesson.title,
      shortDesc: lesson.shortDesc,
      type: 'VIDEO' as const,
      order: lesson.order,
      chapterId: lesson.chapterId,
      duration: lesson.duration,
      videoUrl: this.buildVideoUrl(lesson.videoId ?? '', lesson.provider as LessonProvider),
      videoKey: lesson.videoKey,
    })
  }

  private buildVideoUrl(videoId: string, provider: LessonProvider): string {
    if (provider === LessonProvider.YOUTUBE) {
      return `https://www.youtube.com/watch?v=${videoId}`
    }
    // TODO: CLOUDINARY CDN URL khi có library ID
    return videoId
  }
}
