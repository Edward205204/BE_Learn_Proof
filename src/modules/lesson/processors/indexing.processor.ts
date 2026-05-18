import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { PrismaService } from '../../../shared/services/prisma.service'
import { ChunkingService } from '../../../shared/services/chunking.service'
import { EmbeddingService } from '../../ai/embedding.service'
import { VectorStoreService } from '../../../shared/services/vector-store.service'
import { Logger } from '@nestjs/common'
import { AiJobStatus } from 'src/generated/prisma/enums'

@Processor('lesson-indexing')
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    super()
  }

  async process(job: Job<{ lessonId: string; aiJobId: string }>) {
    const { lessonId, aiJobId } = job.data
    this.logger.log(`Start indexing lesson: ${lessonId}`)

    try {
      await this.prisma.aiJob.update({
        where: { id: aiJobId },
        data: { status: AiJobStatus.PROCESSING, error: null },
      })

      // 1. Lấy lesson từ DB
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
      })

      if (!lesson) {
        this.logger.warn(`Lesson not found: ${lessonId}`)
        await this.prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: AiJobStatus.COMPLETED,
            result: { skipped: true, reason: 'LESSON_NOT_FOUND' },
          },
        })
        return
      }

      // 2. Build source-aware context sections.
      const sections = this.chunkingService.buildContextSections(lesson)
      if (sections.length === 0) {
        this.logger.log(`No content to index for lesson: ${lessonId}`)
        await this.prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: AiJobStatus.COMPLETED,
            result: { skipped: true, reason: 'NO_CONTENT' },
          },
        })
        return
      }

      // 3. Split each section separately so retrieval can include/exclude transcript by metadata.
      const chunks = sections.flatMap((section) =>
        this.chunkingService.splitText(section.content).map((content) => ({
          content,
          metadata: {
            source: section.source,
            label: section.label,
          },
        })),
      )
      if (chunks.length === 0) {
        this.logger.log(`No chunks generated for lesson: ${lessonId}`)
        await this.prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: AiJobStatus.COMPLETED,
            result: { skipped: true, reason: 'NO_CHUNKS' },
          },
        })
        return
      }

      // 4. EmbeddingService.generateEmbeddings(chunks)
      const embeddings = await this.embeddingService.generateEmbeddings(chunks.map((chunk) => chunk.content))

      // 5. VectorStoreService.upsertChunks
      const chunksToInsert = chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: chunk.metadata,
      }))

      await this.vectorStoreService.upsertChunks(lessonId, chunksToInsert)
      this.logger.log(`Successfully indexed lesson: ${lessonId} with ${chunks.length} chunks`)

      // 6. Update lesson.transcriptStatus = 'AVAILABLE' nếu cần (giả định nếu transcript không rỗng)
      if (lesson.transcript && lesson.transcriptStatus !== 'AVAILABLE') {
        await this.prisma.lesson.update({
          where: { id: lessonId },
          data: { transcriptStatus: 'AVAILABLE' },
        })
      }

      await this.prisma.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: AiJobStatus.COMPLETED,
          result: { chunkCount: chunks.length },
        },
      })
    } catch (error: any) {
      await this.prisma.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: AiJobStatus.FAILED,
          error: error.message || 'Unknown error',
          retries: job.attemptsMade,
        },
      })
      throw error
    }
  }
}
