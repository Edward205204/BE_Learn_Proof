import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import envConfig from '../config'
import React from 'react'
import OTPEmail from 'src/emails/otp-verify-email'

@Injectable()
export class MailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY)
  }

  async sendOtp(email: string, otp: string) {
    const component = React.createElement(OTPEmail, { otpCode: otp, title: 'Mã otp xác thực tài khoản Learn Proof' })
    return await this.resend.emails.send({
      from: `${envConfig.APP_NAME} <learnproof@gmail.com>`,
      to: [email],
      subject: 'Mã otp xác thực tài khoản Learn Proof',
      react: component,
    })
  }
}
