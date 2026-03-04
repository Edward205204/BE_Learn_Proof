import { createZodDto } from 'nestjs-zod'
import z from 'zod'

export const MessageResSchema = z.object({
  message: z.string(),
})

export type MessageResType = z.infer<typeof MessageResSchema>
export class MessageResDTO extends createZodDto(MessageResSchema) {}
