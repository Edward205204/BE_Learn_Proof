import z from 'zod'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config({
  path: '.env',
})
// Kiểm tra coi thử có file .env hay chưa
if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Không tìm thấy file .env')
  process.exit(1)
}

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string(),
  DATABASE_URL: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_IN: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN: z.string(),
  SECRET_API_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  OTP_BUFFER_TIME: z.string(),
  OTP_EXPIRES_IN: z.string(),
  FE_URL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GOOGLE_CLIENT_REDIRECT_URI: z.string(),
  RESEND_DOMAIN: z.string(),

  VNP_TMN_CODE: z.string(),
  VNP_HASH_SECRET: z.string(),
  RETURN_URL: z.string(),
  // ADMIN_NAME: z.string(),
  // ADMIN_PASSWORD: z.string(),
  // ADMIN_EMAIL: z.string(),
  // ADMIN_PHONE_NUMBER: z.string(),
  // GOOGLE_CLIENT_ID: z.string(),
  // GOOGLE_CLIENT_SECRET: z.string(),
  // GOOGLE_REDIRECT_URI: z.string(),
  // GOOGLE_CLIENT_REDIRECT_URI: z.string(),

  CLOUD_TOKEN_VALUE: z.string(),
  CLOUD_ACCESS_KEY_ID: z.string(),
  CLOUD_SECRET_ACCESS_KEY: z.string(),
  ENDPOINT_CLOUD_STORE: z.string(),
  PUBLIC_CLOUD_STORE_URL: z.string().optional(),
  CLOUDINARY_ACCOUNT_ID: z.string(),
  R2_BUCKET_NAME: z.string().default('learn-proof'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  LLM_API_KEY: z.string(),
  LLM_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  LLM_HTTP_REFERER: z.string().optional(),
  LLM_X_TITLE: z.string().default('Learn Proof'),

  LLM_EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  LLM_CHAT_MODEL_CHEAP: z.string().default('openai/gpt-4o-mini'),
  LLM_CHAT_MODEL_STRONG: z.string().default('openai/gpt-4o'),

  AI_MAX_INPUT_TOKENS: z.coerce.number().default(4000),
  AI_CHUNK_SIZE: z.coerce.number().default(500),
  AI_CHUNK_OVERLAP: z.coerce.number().default(50),
  AI_TOP_K: z.coerce.number().default(5),

  LLM_MOCK: z.string().default('true'),
})

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.log('Các giá trị khai báo trong file .env không hợp lệ!')
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data

export default envConfig
