import { createZodDto } from 'nestjs-zod'

import { LoginBodySchema, RegisterBodySchema, SendOtp } from './auth.model'

export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}
export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}
export class SendOtpDTO extends createZodDto(SendOtp) {}
