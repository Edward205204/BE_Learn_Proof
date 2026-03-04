import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const EmptyBodySchema = z.object({}).strict()

export type EmptyBodyType = z.infer<typeof EmptyBodySchema>

export class EmptyBodyDTO extends createZodDto(EmptyBodySchema) {}
