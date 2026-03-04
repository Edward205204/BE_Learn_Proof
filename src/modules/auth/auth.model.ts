import { Role } from 'src/generated/prisma/enums'
import { z } from 'zod'

const PasswordSchema = z
  .string()
  .min(1, 'Mật khẩu là bắt buộc')
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(100, 'Mật khẩu quá dài')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ viết hoa')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt')

export const LoginBodySchema = z
  .object({
    email: z.string().trim().min(1, 'Email là bắt buộc').max(255, 'Email quá dài').email('Email không đúng định dạng'),

    password: PasswordSchema,
  })
  .strict()

export const RegisterBodySchema = z
  .object({
    email: z.string().trim().min(1, 'Email là bắt buộc').max(255, 'Email quá dài').email('Email không đúng định dạng'),
    fullName: z.string().trim().min(1, 'Tên là bắt buộc').max(255, 'Tên quá dài'),
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
    code: z.string().trim().length(6, 'Mã otp không đúng định dạng'),
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
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  avatar: z.string().nullable(),
  role: z.enum(Role),
})

export const AuthResDto = z.object({
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
  user: UserResSchema,
})

export const SendOtp = z.object({
  email: z.string().trim().min(1, 'Email là bắt buộc').max(255, 'Email quá dài').email('Email không đúng định dạng'),
})

export type LoginBodyType = z.infer<typeof LoginBodySchema>
export type AuthResType = z.infer<typeof AuthResDto>
export type RegisterBodyType = z.infer<typeof RegisterBodySchema>
export type SendOtpType = z.infer<typeof SendOtp>
