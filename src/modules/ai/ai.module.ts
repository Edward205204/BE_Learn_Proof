import { Module } from '@nestjs/common'
import { LlmService } from './llm.service'
import { EmbeddingService } from './embedding.service'
import { PromptTemplateService } from './prompt-template.service'

@Module({
  providers: [LlmService, EmbeddingService, PromptTemplateService],
  exports: [LlmService, EmbeddingService, PromptTemplateService],
})
export class AiModule {}
