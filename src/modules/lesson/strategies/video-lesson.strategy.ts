import { Injectable } from '@nestjs/common'
import { LessonStrategy } from './lesson.strategy.interface'
import { LessonRepo } from '../lesson.repo'
import { CreateLessonBodyType, LessonProvider, LessonType } from '../lesson.model'
import { BaseLessonStrategy } from './base-lesson.strategy'
import { QuizCmsService } from 'src/modules/quiz/quiz-cms.service'
import { Transactional } from '@nestjs-cls/transactional'
import { LessonDetailRaw, VideoLessonDetailResponse } from '../lesson.response'
import envConfig from 'src/shared/config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class VideoLessonStrategy implements LessonStrategy {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly baseLessonStrategy: BaseLessonStrategy,
    private readonly quizService: QuizCmsService,
  ) {}
  private readonly bucketName = envConfig.R2_BUCKET_NAME
  private readonly endpoint = envConfig.ENDPOINT_CLOUD_STORE.replace(/\/+$/, '')
  private readonly s3Client = new S3Client({
    region: 'auto',
    endpoint: this.endpoint,
    credentials: {
      accessKeyId: envConfig.CLOUD_ACCESS_KEY_ID,
      secretAccessKey: envConfig.CLOUD_SECRET_ACCESS_KEY,
    },
  })

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

  async get(lesson: LessonDetailRaw): Promise<VideoLessonDetailResponse> {
    return {
      id: lesson.id,
      title: lesson.title,
      shortDesc: lesson.shortDesc,
      type: 'VIDEO' as const,
      order: lesson.order,
      chapterId: lesson.chapterId,
      duration: lesson.duration,
      videoUrl: await this.buildVideoUrl(lesson),
      videoKey: lesson.videoKey,
    }
  }

  /**
   * R2 / file: FE cần URL public (r2.dev hoặc custom domain), không phải endpoint S3 API.
   */
  private async buildVideoUrl(lesson: LessonDetailRaw): Promise<string> {
    const provider = lesson.provider as LessonProvider
    const videoId = (lesson.videoId ?? '').trim()
    const videoKey = lesson.videoKey?.trim() || null

    if (provider === LessonProvider.YOUTUBE) {
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    const publicBase = envConfig.PUBLIC_CLOUD_STORE_URL?.replace(/\/+$/, '')

    const isHttp = /^https?:\/\//i.test(videoId)
    const isR2ApiUrl = /r2\.cloudflarestorage\.com/i.test(videoId)

    if (isHttp && !isR2ApiUrl) {
      return videoId
    }

    if (publicBase && videoKey) {
      return `${publicBase}/${videoKey.replace(/^\/+/, '')}`
    }

    if (publicBase && videoId && !isHttp) {
      return `${publicBase}/${videoId.replace(/^\/+/, '')}`
    }

    if (publicBase && isR2ApiUrl) {
      try {
        const url = new URL(videoId)
        const rawPath = url.pathname.replace(/^\/+/, '')
        if (!rawPath) return videoId

        const bucket = envConfig.R2_BUCKET_NAME
        const normalizedPath = rawPath.startsWith(`${bucket}/`) ? rawPath.slice(bucket.length + 1) : rawPath
        if (normalizedPath) return `${publicBase}/${normalizedPath}`
      } catch {
        return this.signVideoUrl(videoId, videoKey)
      }
    }

    return this.signVideoUrl(videoId, videoKey)
  }

  private extractVideoKey(videoId: string, videoKey: string | null): string | null {
    if (videoKey) return videoKey.replace(/^\/+/, '')

    if (!videoId) return null
    if (!/^https?:\/\//i.test(videoId)) return videoId.replace(/^\/+/, '')

    try {
      const url = new URL(videoId)
      const path = url.pathname.replace(/^\/+/, '')
      if (!path) return null
      if (path.startsWith(`${this.bucketName}/`)) return path.slice(this.bucketName.length + 1)
      return path
    } catch {
      return null
    }
  }

  private async signVideoUrl(videoId: string, videoKey: string | null): Promise<string> {
    const key = this.extractVideoKey(videoId, videoKey)
    if (!key) return videoId

    try {
      return await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
        { expiresIn: 60 * 60 },
      )
    } catch {
      return videoId
    }
  }
}
