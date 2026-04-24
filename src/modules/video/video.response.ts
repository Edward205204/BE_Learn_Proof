import { z } from 'zod'

export const UploadVideoResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
})
