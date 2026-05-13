import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import envConfig from '../../shared/config'
import { LlmUnavailableException } from './ai.error'

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text])
    return embeddings[0]
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return []
    const payload = {
      model: envConfig.LLM_EMBEDDING_MODEL,
      input: texts,
    }

    try {
      const response = await axios.post(`${envConfig.LLM_BASE_URL}/embeddings`, payload, {
        headers: {
          Authorization: `Bearer ${envConfig.LLM_API_KEY}`,
          'HTTP-Referer': envConfig.LLM_HTTP_REFERER || '',
          'X-Title': envConfig.LLM_X_TITLE,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      })

      const data = response.data
      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid embeddings response')
      }

      // Ensure they are ordered properly according to the input
      const orderedEmbeddings = [...data.data].sort((a, b) => a.index - b.index)
      return orderedEmbeddings.map((item) => item.embedding)
    } catch (error) {
      this.logger.error('Error generating embeddings', error)
      throw new LlmUnavailableException('Embedding service unavailable')
    }
  }
}
