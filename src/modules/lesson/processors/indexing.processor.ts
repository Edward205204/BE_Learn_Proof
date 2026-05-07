import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { PrismaService } from '../../../shared/services/prisma.service'
import { ChunkingService } from '../../../shared/services/chunking.service'
import { EmbeddingService } from '../../ai/embedding.service'
import { VectorStoreService } from '../../../shared/services/vector-store.service'
import { Logger } from '@nestjs/common'

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

  async process(job: Job<{ lessonId: string }>) {
    const { lessonId } = job.data
    this.logger.log(`Start indexing lesson: ${lessonId}`)

    // 1. Lấy lesson từ DB
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    })

    if (!lesson) {
      this.logger.warn(`Lesson not found: ${lessonId}`)
      return
    }

    // 2. Build context
    const context = this.chunkingService.buildContext(lesson)
    if (!context) {
      this.logger.log(`No content to index for lesson: ${lessonId}`)
      return
    }

    // 3. ChunkingService.splitText(context)
    const chunks = this.chunkingService.splitText(context)
    if (chunks.length === 0) {
      this.logger.log(`No chunks generated for lesson: ${lessonId}`)
      return
    }

    // 4. EmbeddingService.generateEmbeddings(chunks)
    const embeddings = await this.embeddingService.generateEmbeddings(chunks)

    // 5. VectorStoreService.upsertChunks
    const chunksToInsert = chunks.map((content, index) => ({
      chunkIndex: index,
      content,
      embedding: embeddings[index],
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
  }
}
