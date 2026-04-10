import { z } from 'zod'

export const UploadMediaResponseSchema = z.object({
  url: z.string(),
})
