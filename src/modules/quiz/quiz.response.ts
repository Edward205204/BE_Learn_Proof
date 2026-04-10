import { z } from 'zod'

// Tạm thời sử dụng z.any() cho các schema phức tạp để tránh mất dữ liệu do chế độ strip của ZodSerializerDto
export const QuizBasicResponseSchema = z.any()
export const QuizSubmitResponseSchema = z.any()
export const QuizResultResponseSchema = z.any()
export const QuizCheckAnswerResponseSchema = z.any()
