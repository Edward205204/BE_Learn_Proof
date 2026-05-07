import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosError } from 'axios'
import { envConfig } from 'src/shared/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LlmModel = 'cheap' | 'strong'

export interface ChatCompletionParams {
  systemPrompt: string
  userPrompt: string
  model?: LlmModel
  responseFormat?: 'json'
  maxTokens?: number
}

export interface ChatCompletionResult {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
  latencyMs: number
}

// ---------------------------------------------------------------------------
// Custom Errors — map từng HTTP status thành exception rõ ràng
// ---------------------------------------------------------------------------

export class LlmAuthException extends Error {
  constructor() {
    super('LLM auth failed (401/403) — check LLM_API_KEY')
  }
}
export class LlmRateLimitException extends Error {
  constructor() {
    super('LLM rate limit hit (429) — retry later')
  }
}
export class LlmUnavailableException extends Error {
  constructor(attempts: number) {
    super(`LLM unavailable after ${attempts} attempts (5xx)`)
  }
}
export class LlmTimeoutException extends Error {
  constructor() {
    super('LLM request timed out (30s)')
  }
}
export class LlmInvalidJsonException extends Error {
  constructor(raw: string) {
    super(`LLM returned invalid JSON: ${raw.slice(0, 120)}`)
  }
}
export class LlmEmptyResponseException extends Error {
  constructor() {
    super('LLM returned empty content')
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max chars gửi lên LLM (thay tiktoken — đủ dùng cho sprint này) */
const MAX_INPUT_CHARS = (envConfig.AI_MAX_INPUT_TOKENS ?? 4000) * 4 // ~4 chars/token

const RETRY_DELAY_MS = 1000
const MAX_ATTEMPTS = 3
const TIMEOUT_MS = 30_000

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 422])

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)

  private resolveModel(model: LlmModel = 'cheap'): string {
    return model === 'strong' ? envConfig.LLM_CHAT_MODEL_STRONG : envConfig.LLM_CHAT_MODEL_CHEAP
  }

  /**
   * Strip markdown code fences Gemini / GPT hay thêm dù đã set response_format.
   * Input:  ```json\n{"a":1}\n```
   * Output: {"a":1}
   */
  private stripFences(text: string): string {
    return text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()
  }

  /**
   * Truncate text theo char count để tránh vượt context window.
   * Cắt ở word boundary gần nhất để tránh cắt giữa từ.
   */
  private truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text
    const cut = text.slice(0, maxChars)
    const lastSpace = cut.lastIndexOf(' ')
    return (lastSpace > maxChars * 0.8 ? cut.slice(0, lastSpace) : cut) + ' [truncated]'
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ---------------------------------------------------------------------------
  // Main method
  // ---------------------------------------------------------------------------

  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const { systemPrompt, userPrompt, model = 'cheap', responseFormat, maxTokens = 1000 } = params

    const resolvedModel = this.resolveModel(model)

    // Truncate user prompt nếu quá dài (system prompt thường ngắn, không cần truncate)
    const safeUserPrompt = this.truncate(userPrompt, MAX_INPUT_CHARS)

    const body: Record<string, unknown> = {
      model: resolvedModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: safeUserPrompt },
      ],
    }

    if (responseFormat === 'json') {
      body.response_format = { type: 'json_object' }
    }

    let lastError: Error | null = null
    const startTime = Date.now()

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        this.logger.debug(`LLM attempt ${attempt}/${MAX_ATTEMPTS} model=${resolvedModel}`)

        const response = await axios.post(`${envConfig.LLM_BASE_URL}/chat/completions`, body, {
          timeout: TIMEOUT_MS,
          headers: {
            Authorization: `Bearer ${envConfig.LLM_API_KEY}`,
            'Content-Type': 'application/json',
            ...(envConfig.LLM_HTTP_REFERER && { 'HTTP-Referer': envConfig.LLM_HTTP_REFERER }),
            ...(envConfig.LLM_X_TITLE && { 'X-Title': envConfig.LLM_X_TITLE }),
          },
        })

        const latencyMs = Date.now() - startTime
        const choice = response.data?.choices?.[0]
        const rawContent: string = choice?.message?.content ?? ''

        // Empty response
        if (!rawContent.trim()) throw new LlmEmptyResponseException()

        // Strip fences & parse JSON nếu cần
        let content = rawContent
        if (responseFormat === 'json') {
          const stripped = this.stripFences(rawContent)
          try {
            JSON.parse(stripped) // validate — throw nếu invalid
            content = stripped
          } catch {
            throw new LlmInvalidJsonException(rawContent)
          }
        }

        const usage = response.data?.usage ?? {}

        this.logger.debug(
          `LLM OK attempt=${attempt} latency=${latencyMs}ms ` +
            `in=${usage.prompt_tokens} out=${usage.completion_tokens}`,
        )

        return {
          content,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
          model: resolvedModel,
          latencyMs,
        }
      } catch (err) {
        // Custom errors — không retry
        if (err instanceof LlmEmptyResponseException || err instanceof LlmInvalidJsonException) throw err

        // Axios HTTP errors
        if (axios.isAxiosError(err)) {
          const axiosErr = err as AxiosError
          const status = axiosErr.response?.status

          // Timeout
          if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
            lastError = new LlmTimeoutException()
            this.logger.warn(`LLM timeout attempt=${attempt}`)
            if (attempt < MAX_ATTEMPTS) {
              await this.delay(RETRY_DELAY_MS)
              continue
            }
            throw lastError
          }

          // Auth — không retry
          if (status === 401 || status === 403) throw new LlmAuthException()

          // Non-retryable
          if (status && NON_RETRYABLE_STATUS.has(status)) {
            throw new Error(`LLM bad request: ${status} ${axiosErr.message}`)
          }

          // Rate limit
          if (status === 429) {
            lastError = new LlmRateLimitException()
            this.logger.warn(`LLM rate limit attempt=${attempt}`)
            if (attempt < MAX_ATTEMPTS) {
              await this.delay(RETRY_DELAY_MS * attempt)
              continue
            }
            throw lastError
          }

          // 5xx retryable
          if (status && RETRYABLE_STATUS.has(status)) {
            lastError = new LlmUnavailableException(attempt)
            this.logger.warn(`LLM ${status} attempt=${attempt}`)
            if (attempt < MAX_ATTEMPTS) {
              await this.delay(RETRY_DELAY_MS)
              continue
            }
            throw lastError
          }

          // Network error (ECONNRESET, ENOTFOUND, etc.)
          lastError = new Error(`LLM network error: ${axiosErr.message}`)
          if (attempt < MAX_ATTEMPTS) {
            await this.delay(RETRY_DELAY_MS)
            continue
          }
          throw lastError
        }

        // Unknown error — không retry
        throw err
      }
    }

    throw lastError ?? new LlmUnavailableException(MAX_ATTEMPTS)
  }
}
