import { Role } from 'src/generated/prisma/enums'
import { z } from 'zod'

// ─── Seed account (thay đổi nếu reset DB) ────────────────────────────────────
const SEED_EMAIL = 'nguyentminhkhoa1@gmail.com'
const SEED_PASSWORD = '123456@Aa'
// ─────────────────────────────────────────────────────────────────────────────

const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email là bắt buộc')
  .max(255, 'Email quá dài')
  .email('Email không đúng định dạng')
  .meta({ description: 'Địa chỉ email hợp lệ', example: SEED_EMAIL })

const PasswordSchema = z
  .string()
  .min(1, 'Mật khẩu là bắt buộc')
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(100, 'Mật khẩu quá dài')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ viết hoa')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt')
  .meta({ description: 'Mật khẩu: tối thiểu 8 ký tự, có HOA + số + ký tự đặc biệt', example: SEED_PASSWORD })

export const LoginBodySchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
  })
  .strict()

export const RegisterBodySchema = z
  .object({
    email: EmailSchema,
    fullName: z
      .string()
      .trim()
      .min(1, 'Tên là bắt buộc')
      .max(255, 'Tên quá dài')
      .meta({ description: 'Họ và tên đầy đủ', example: 'Nguyễn Thái Vinh' }),
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
    code: z
      .string()
      .trim()
      .length(6, 'Mã otp không đúng định dạng')
      .meta({ description: 'Mã OTP 6 chữ số gửi về email', example: '123456' }),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu và xác nhận mật khẩu không khớp',
        path: ['confirmPassword'],
      })
    }
  })

export const UserResSchema = z.object({
  id: z.string().meta({ description: 'ID người dùng (CUID)', example: 'cmabcdef0001k7k4ctlc7k7' }),
  email: z.string().meta({ description: 'Địa chỉ email', example: SEED_EMAIL }),
  fullName: z.string().meta({ description: 'Tên đầy đủ', example: 'Content Manager' }),
  avatar: z.string().nullable().meta({ description: 'URL ảnh đại diện', example: null }),
  bio: z.string().nullable().meta({ description: 'Giới thiệu bản thân', example: null }),
  headline: z.string().nullable().meta({ description: 'Tiêu đề nghề nghiệp', example: null }),
  website: z.string().nullable().meta({ description: 'Đường dẫn website cá nhân', example: null }),
  role: z.enum(Role).meta({ description: 'Vai trò người dùng', example: 'CONTENT_MANAGER' }),
})

export const UpdateProfileBodySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .meta({ description: 'Tên đầy đủ mới', example: 'Nguyễn Thái Vinh' }),
  bio: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .meta({
      description: 'Tiểu sử / giới thiệu bản thân (tối đa 2000 ký tự)',
      example: 'Tôi là lập trình viên yêu thích Blockchain và AI.',
    }),
  headline: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .optional()
    .meta({
      description: 'Tiêu đề nghề nghiệp ngắn (tối đa 60 ký tự)',
      example: 'Fullstack Developer | Blockchain Enthusiast',
    }),
  website: z
    .string()
    .trim()
    .url('URL không hợp lệ')
    .nullable()
    .optional()
    .or(z.literal(''))
    .meta({ description: 'URL website cá nhân', example: 'https://github.com/thaivinhdev' }),
})

export const AuthResDto = z.object({
  tokens: z.object({
    accessToken: z
      .string()
      .meta({
        description: 'JWT Access Token (dùng để gọi các API bảo mật)',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      }),
    refreshToken: z
      .string()
      .meta({
        description: 'JWT Refresh Token (dùng để lấy Access Token mới)',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      }),
  }),
  user: UserResSchema,
})

export const SendOtpBodySchema = z
  .object({
    email: EmailSchema,
  })
  .strict()

export const ForgotPasswordBodySchema = z
  .object({
    email: EmailSchema,
  })
  .strict()

export const ForgotPasswordVerifyBodySchema = z
  .object({
    email: EmailSchema,
    code: z
      .string()
      .trim()
      .length(6, 'Mã otp không đúng định dạng')
      .meta({ description: 'Mã OTP 6 chữ số nhận qua email', example: '654321' }),
  })
  .strict()

export const ResetPasswordBodySchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu và xác nhận mật khẩu không khớp',
        path: ['confirmPassword'],
      })
    }
  })

export type ResetPasswordBodyType = z.infer<typeof ResetPasswordBodySchema>
export type ForgotPasswordVerifyBodyType = z.infer<typeof ForgotPasswordVerifyBodySchema>
export type ForgotPasswordBodyType = z.infer<typeof ForgotPasswordBodySchema>
export type LoginBodyType = z.infer<typeof LoginBodySchema>
export type AuthResType = z.infer<typeof AuthResDto>
export type RegisterBodyType = z.infer<typeof RegisterBodySchema>
export type SendOtpBodyType = z.infer<typeof SendOtpBodySchema>
