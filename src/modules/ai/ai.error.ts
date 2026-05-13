export class LlmRateLimitException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmRateLimitException'
  }
}

export class LlmUnavailableException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmUnavailableException'
  }
}

export class LlmTimeoutException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmTimeoutException'
  }
}

export class LlmInvalidJsonException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmInvalidJsonException'
  }
}

export class LlmEmptyResponseException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmEmptyResponseException'
  }
}

export class LlmAuthException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmAuthException'
  }
}
