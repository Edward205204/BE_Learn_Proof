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
    return this.buildContextSections(lesson)
      .map((section) => section.content)
      .join('\n\n')
  }

  buildContextSections(lesson: any): { source: string; label: string; content: string }[] {
    const sections: { source: string; label: string; content: string }[] = []
    const metadata = [
      lesson.title ? `Title: ${lesson.title}` : null,
      lesson.shortDesc ? `Short Description: ${lesson.shortDesc}` : null,
      lesson.lessonDesc ? `Full Description: ${lesson.lessonDesc}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (metadata) {
      sections.push({
        source: 'lesson_metadata',
        label: 'Lesson Metadata',
        content: metadata,
      })
    }

    if (lesson.textContent) {
      sections.push({
        source: 'lesson_content',
        label: 'Lesson Content',
        content: lesson.textContent,
      })
    }

    if (lesson.transcript) {
      sections.push({
        source: 'transcript',
        label: 'Transcript',
        content: lesson.transcript,
      })
    }

    return sections
  }
}
