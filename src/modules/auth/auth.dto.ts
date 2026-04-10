import { createZodDto } from 'nestjs-zod'

import {
  ForgotPasswordBodySchema,
  ForgotPasswordVerifyBodySchema,
  LoginBodySchema,
  RegisterBodySchema,
  SendOtpBodySchema,
  ResetPasswordBodySchema,
  UpdateProfileBodySchema,
} from './auth.model'

export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}
export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}
export class SendOtpDTO extends createZodDto(SendOtpBodySchema) {}
export class ForgotPassworDto extends createZodDto(ForgotPasswordBodySchema) {}
export class ForgotPasswordVerifyDto extends createZodDto(ForgotPasswordVerifyBodySchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordBodySchema) {}
export class UpdateProfileDto extends createZodDto(UpdateProfileBodySchema) {}
