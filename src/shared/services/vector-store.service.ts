import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { randomUUID } from 'crypto'

@Injectable()
export class VectorStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertChunks(
    lessonId: string,
    chunks: {
      chunkIndex: number
      content: string
      embedding: number[]
      metadata?: object
    }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete old chunks
      await tx.lessonChunk.deleteMany({
        where: { lessonId },
      })

      // Insert new chunks using raw SQL because Prisma doesn't natively support vector writes
      for (const chunk of chunks) {
        const metadataStr = chunk.metadata ? JSON.stringify(chunk.metadata) : null
        const embeddingStr = `[${chunk.embedding.join(',')}]`

        await tx.$executeRawUnsafe(
          `INSERT INTO "LessonChunk" ("id", "lessonId", "chunkIndex", "content", "embedding", "metadata", "version", "createdAt") 
           VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, 1, NOW())`,
          randomUUID(),
          lessonId,
          chunk.chunkIndex,
          chunk.content,
          embeddingStr,
          metadataStr,
        )
      }
    })
  }

  async searchSimilar(
    queryEmbedding: number[],
    options: {
      lessonId: string
      topK?: number
      minScore?: number
      sourceIn?: string[]
    },
  ): Promise<{ content: string; score: number; metadata: object }[]> {
    const topK = options.topK || 5
    const embeddingStr = `[${queryEmbedding.join(',')}]`
    const sourceFilter =
      options.sourceIn && options.sourceIn.length > 0
        ? `AND "metadata"->>'source' IN (${options.sourceIn.map((source) => `'${this.escapeSqlString(source)}'`).join(', ')})`
        : ''

    // Distance using <=> (cosine distance). 1 - distance = cosine similarity
    const results = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT "content", "metadata", 1 - ("embedding" <=> $1::vector) as "score"
       FROM "LessonChunk"
       WHERE "lessonId" = $2
       ${sourceFilter}
       ORDER BY "embedding" <=> $1::vector
       LIMIT $3`,
      embeddingStr,
      options.lessonId,
      topK,
    )

    let filtered = results
    if (options.minScore) {
      filtered = results.filter((r) => r.score >= options.minScore!)
    }

    return filtered.map((r) => ({
      content: r.content,
      score: r.score,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
    }))
  }

  private escapeSqlString(value: string) {
    return value.replace(/'/g, "''")
  }
}
