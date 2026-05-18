import { Injectable } from '@nestjs/common'
import envConfig from '../config'

@Injectable()
export class ChunkingService {
  splitText(
    text: string,
    options?: {
      chunkSize?: number
      overlap?: number
    },
  ): string[] {
    const chunkSize = options?.chunkSize || envConfig.AI_CHUNK_SIZE
    const overlap = options?.overlap || envConfig.AI_CHUNK_OVERLAP

    // Basic sliding window by words
    const words = text.split(/\s+/)
    const chunks: string[] = []

    if (words.length === 0) return []

    let i = 0
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize)
      chunks.push(chunkWords.join(' '))
      i += chunkSize - overlap
      // Prevent infinite loop if overlap >= chunkSize
      if (chunkSize - overlap <= 0) {
        break
      }
    }

    return chunks
  }

  buildContext(lesson: any): string {
    const parts = [lesson.shortDesc, lesson.lessonDesc]
    if (lesson.textContent) parts.push(lesson.textContent)
    if (lesson.transcript) parts.push(lesson.transcript)
    return parts.filter(Boolean).join('\n\n')
  }
}
