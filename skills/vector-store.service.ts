import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { envConfig } from 'src/shared/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpsertChunk {
  chunkIndex: number
  content: string
  embedding: number[] // phải là vector(1536) — validate trước khi gọi
  metadata?: Record<string, unknown>
}

export interface SimilarChunk {
  content: string
  score: number // cosine similarity: 0.0 – 1.0 (cao hơn = liên quan hơn)
  chunkIndex: number
  metadata: Record<string, unknown>
}

export interface SearchOptions {
  lessonId: string
  topK?: number // default: AI_TOP_K env (5)
  minScore?: number // default: 0.0 (không filter)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPECTED_DIM = 1536 // phải khớp với Prisma schema vector(1536)

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Validate embedding dimension trước khi insert
  // ---------------------------------------------------------------------------

  private validateEmbedding(embedding: number[], context: string): void {
    if (!Array.isArray(embedding) || embedding.length !== EXPECTED_DIM) {
      throw new Error(
        `${context}: embedding dimension mismatch — expected ${EXPECTED_DIM}, got ${embedding?.length ?? 'null'}`,
      )
    }
  }

  /**
   * Format number[] thành chuỗi pgvector hiểu: [0.1,0.2,...,0.n]
   */
  private formatVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`
  }

  // ---------------------------------------------------------------------------
  // Upsert chunks (xóa cũ → insert mới, trong transaction)
  // ---------------------------------------------------------------------------

  /**
   * Thay toàn bộ chunks của một lesson bằng set mới.
   * Strategy: DELETE WHERE lessonId + INSERT ALL — đơn giản, đảm bảo consistency.
   *
   * @throws nếu bất kỳ embedding nào sai dimension
   */
  async upsertChunks(lessonId: string, chunks: UpsertChunk[]): Promise<void> {
    if (chunks.length === 0) {
      this.logger.warn(`upsertChunks: lessonId=${lessonId} — empty chunks, skipping`)
      return
    }

    // Validate tất cả embeddings trước khi bắt đầu transaction
    for (const chunk of chunks) {
      this.validateEmbedding(chunk.embedding, `chunk[${chunk.chunkIndex}]`)
    }

    this.logger.debug(`upsertChunks: lessonId=${lessonId} count=${chunks.length}`)

    await this.prisma.$transaction(async (tx) => {
      // 1. Xóa chunks cũ
      await tx.lessonChunk.deleteMany({ where: { lessonId } })

      // 2. Insert chunks mới bằng raw SQL (Prisma không support vector type natively)
      //    Dùng unnest để insert batch trong 1 query — nhanh hơn loop
      const values = chunks
        .map((_, i) => {
          const base = i * 4
          return `($${base + 1}, $${base + 2}::int, $${base + 3}::text, $${base + 4}::vector)`
        })
        .join(', ')

      const params: unknown[] = []
      for (const chunk of chunks) {
        params.push(lessonId, chunk.chunkIndex, chunk.content, this.formatVector(chunk.embedding))
      }

      await (tx as any).$executeRawUnsafe(
        `INSERT INTO "LessonChunk" ("lessonId", "chunkIndex", "content", "embedding")
         VALUES ${values}`,
        ...params,
      )

      // 3. Insert metadata nếu có (update riêng vì Json column dễ handle hơn)
      const chunksWithMeta = chunks.filter((c) => c.metadata)
      if (chunksWithMeta.length > 0) {
        for (const chunk of chunksWithMeta) {
          await tx.lessonChunk.updateMany({
            where: { lessonId, chunkIndex: chunk.chunkIndex },
            data: { metadata: chunk.metadata as any },
          })
        }
      }
    })

    this.logger.debug(`upsertChunks: done lessonId=${lessonId}`)
  }

  // ---------------------------------------------------------------------------
  // Search similar chunks
  // ---------------------------------------------------------------------------

  /**
   * Tìm top-K chunks gần nhất với queryEmbedding theo cosine similarity.
   * Dùng pgvector `<=>` (cosine distance) — score = 1 - distance.
   *
   * Sequential scan (không có IVFFlat index trong sprint này) — OK cho dev/staging.
   */
  async searchSimilar(queryEmbedding: number[], options: SearchOptions): Promise<SimilarChunk[]> {
    const { lessonId, topK = envConfig.AI_TOP_K ?? 5, minScore = 0.0 } = options

    this.validateEmbedding(queryEmbedding, 'queryEmbedding')

    const vectorStr = this.formatVector(queryEmbedding)

    // cosine distance: <=> → distance (0=identical, 2=opposite)
    // cosine similarity = 1 - distance
    type RawRow = {
      content: string
      chunkIndex: number
      metadata: string | null
      distance: number
    }

    const rows = await this.prisma.$queryRawUnsafe<RawRow[]>(
      `SELECT
         "content",
         "chunkIndex",
         "metadata",
         (embedding <=> $1::vector) AS distance
       FROM "LessonChunk"
       WHERE "lessonId" = $2
       ORDER BY distance ASC
       LIMIT $3`,
      vectorStr,
      lessonId,
      topK,
    )

    return rows
      .map((row) => ({
        content: row.content,
        chunkIndex: row.chunkIndex,
        score: Math.max(0, 1 - Number(row.distance)), // clamp về 0 tránh float weirdness
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      }))
      .filter((r) => r.score >= minScore)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Xóa toàn bộ chunks của lesson — dùng khi lesson bị delete.
   * (Prisma cascade cũng handle, nhưng có thể gọi explicit nếu cần)
   */
  async deleteChunks(lessonId: string): Promise<void> {
    const { count } = await this.prisma.lessonChunk.deleteMany({ where: { lessonId } })
    this.logger.debug(`deleteChunks: lessonId=${lessonId} deleted=${count}`)
  }

  /**
   * Đếm số chunks hiện có — dùng để check lesson đã được index chưa.
   */
  async countChunks(lessonId: string): Promise<number> {
    return this.prisma.lessonChunk.count({ where: { lessonId } })
  }
}
