import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import envConfig from '../../shared/config'
import {
  LlmRateLimitException,
  LlmTimeoutException,
  LlmUnavailableException,
  LlmInvalidJsonException,
  LlmEmptyResponseException,
} from './ai.error'

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)

  async chatCompletion(params: {
    systemPrompt: string
    userPrompt: string
    model?: 'cheap' | 'strong'
    responseFormat?: 'json'
    maxTokens?: number
  }): Promise<{
    content: string
    inputTokens: number
    outputTokens: number
    model: string
    latencyMs: number
  }> {
    // mock test - start
    if (envConfig.LLM_MOCK === 'true') {
      return {
        content: this.getMockResponse(params.responseFormat),
        inputTokens: 100,
        outputTokens: 200,
        model: 'mock',
        latencyMs: 50,
      }
    }
    // mock test - end

    const startTime = Date.now()
    const model = params.model === 'strong' ? envConfig.LLM_CHAT_MODEL_STRONG : envConfig.LLM_CHAT_MODEL_CHEAP

    // Truncate input (rough approximation instead of tiktoken)
    // AI_MAX_INPUT_TOKENS ~ 4000 tokens ~ 16000 chars roughly.
    const maxChars = envConfig.AI_MAX_INPUT_TOKENS * 4
    let userPromptStr = params.userPrompt
    if (userPromptStr.length > maxChars) {
      userPromptStr = userPromptStr.substring(0, maxChars)
      this.logger.warn('Truncated userPrompt to fit max tokens.')
    }

    const payload: any = {
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: userPromptStr },
      ],
    }

    if (params.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' }
    }
    if (params.maxTokens) {
      payload.max_tokens = params.maxTokens
    }

    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      attempts++
      try {
        const response = await axios.post(`${envConfig.LLM_BASE_URL}/chat/completions`, payload, {
          headers: {
            Authorization: `Bearer ${envConfig.LLM_API_KEY}`,
            'HTTP-Referer': envConfig.LLM_HTTP_REFERER || '',
            'X-Title': envConfig.LLM_X_TITLE,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })

        const data = response.data
        const choice = data?.choices?.[0]?.message?.content

        if (!choice) {
          throw new LlmEmptyResponseException('Empty response from LLM')
        }

        let content = choice

        if (params.responseFormat === 'json') {
          content = content.trim()
          if (content.startsWith('```json')) {
            content = content
              .replace(/^```json/, '')
              .replace(/```$/, '')
              .trim()
          } else if (content.startsWith('```')) {
            content = content.replace(/^```/, '').replace(/```$/, '').trim()
          }
          // Validate json parse
          try {
            JSON.parse(content)
          } catch (error) {
            throw new LlmInvalidJsonException('LLM did not return valid JSON')
          }
        }

        return {
          content,
          inputTokens: data?.usage?.prompt_tokens || 0,
          outputTokens: data?.usage?.completion_tokens || 0,
          model: data?.model || model,
          latencyMs: Date.now() - startTime,
        }
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          if (status === 429) {
            this.logger.warn(`Rate limit exceeded. Attempt ${attempts}/${maxAttempts}`)
            if (attempts >= maxAttempts) throw new LlmRateLimitException('Rate limit exceeded after retries')
          } else if (status && status >= 500) {
            this.logger.warn(`LLM unavailable (${status}). Attempt ${attempts}/${maxAttempts}`)
            if (attempts >= maxAttempts) throw new LlmUnavailableException('LLM service unavailable')
          } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            this.logger.warn(`LLM timeout. Attempt ${attempts}/${maxAttempts}`)
            if (attempts >= maxAttempts) throw new LlmTimeoutException('LLM request timed out')
          } else {
            // 400, 401, 403, 422 - Do not retry
            throw error
          }
        } else {
          // Custom error or unhandled error
          if (attempts >= maxAttempts) throw error
        }

        // Delay 1s before retry
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    throw new Error('LLM request failed')
  }

  // Mock function
  private getMockResponse(responseFormat?: string): string {
    if (responseFormat === 'json') {
      // Dùng chung cho cả quiz_gen và rag_answer — LlmService không biết context
      // QuizGenProcessor sẽ nhận cái này
      return JSON.stringify({
        questions: [
          {
            question: 'Mock question 1: Đây là câu hỏi thử nghiệm?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: 'Đây là giải thích mock.',
          },
          {
            question: 'Mock question 2: Câu hỏi thứ hai?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 1,
            explanation: 'Giải thích mock thứ hai.',
          },
          {
            question: 'Mock question 3: Câu hỏi thứ ba?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 2,
            explanation: 'Giải thích mock thứ ba.',
          },
        ],
      })
    }

    // RAG answer
    return JSON.stringify({
      answer: 'Đây là câu trả lời mock từ LLM giả lập.',
      sources: ['Mock source từ context bài học.'],
    })
  }
}
