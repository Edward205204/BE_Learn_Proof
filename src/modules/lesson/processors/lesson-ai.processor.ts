import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'
import { LessonService } from '../lesson.service'
import type { AiOutputLanguage } from 'src/modules/ai/prompt-template.service'

type RagAskJobData = {
  lessonId: string
  aiJobId: string
  requestedBy: string
  question: string
  language?: AiOutputLanguage
}

type LessonContentGenerationJobData = {
  lessonId: string
  aiJobId: string
  requestedBy: string
  keywords?: string
  language?: AiOutputLanguage
}

@Processor('lesson-ai')
export class LessonAiProcessor extends WorkerHost {
  private readonly logger = new Logger(LessonAiProcessor.name)

  constructor(private readonly lessonService: LessonService) {
    super()
  }

  async process(job: Job<RagAskJobData | LessonContentGenerationJobData>) {
    if (job.name === 'rag-ask') {
      const data = job.data as RagAskJobData
      this.logger.log(`Start RAG ask job: ${data.aiJobId}`)
      await this.lessonService.processRagAskJob({ ...data, attemptsMade: job.attemptsMade })
      return
    }

    if (job.name === 'lesson-content-generation') {
      const data = job.data as LessonContentGenerationJobData
      this.logger.log(`Start lesson content generation job: ${data.aiJobId}`)
      await this.lessonService.processLessonContentGenerationJob({ ...data, attemptsMade: job.attemptsMade })
      return
    }

    throw new Error(`Unsupported lesson AI job: ${job.name}`)
  }
}
