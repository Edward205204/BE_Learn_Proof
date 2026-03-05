import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import envConfig from '../config'
import React from 'react'
import OTPEmail from 'src/emails/otp'
import LinkEmail from 'src/emails/link'

@Injectable()
export class MailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY)
  }

  async sendOtp(email: string, otp: string) {
    const component = React.createElement(OTPEmail, {
      otpCode: otp,
      title: 'Mã otp xác thực tài khoản Learn Proof',
      heading: 'Hãy nhập mã xác thực OTP sau vào trang đăng ký tài khoản',
    })
    return await this.resend.emails.send({
      from: `${envConfig.APP_NAME} <no-reply@${envConfig.RESEND_DOMAIN}>`,
      to: [email],
      subject: 'Mã otp xác thực tài khoản Learn Proof',
      react: component,
    })
  }

  async sendLink(email: string, link: string) {
    const component = React.createElement(LinkEmail, {
      link: link,
      title: 'Link đặt lại mật khẩu Learn Proof',
      heading: 'Hãy nhập link sau để tiến hành đặt lại mật khẩu cho tài khoản Learn Proof của bạn',
    })
    return await this.resend.emails.send({
      from: `${envConfig.APP_NAME} <no-reply@${envConfig.RESEND_DOMAIN}>`,
      to: [email],
      subject: 'Link đặt lại mật khẩu Learn Proof',
      react: component,
    })
  }
}
