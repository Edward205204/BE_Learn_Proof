import { UnprocessableEntityException } from '@nestjs/common'

export class EmailOrPasswordInvalidException extends UnprocessableEntityException {
  constructor() {
    super([
      { message: 'Email hoặc mật khẩu không đúng', path: 'email' },
      { message: 'Email hoặc mật khẩu không đúng', path: 'password' },
    ])
  }
}

export class EmailAlreadyExistsException extends UnprocessableEntityException {
  constructor() {
    super([{ message: 'Email đã tồn tại', path: 'email' }])
  }
}

export class InvalidVerificationCodeException extends UnprocessableEntityException {
  constructor() {
    super([{ message: 'Mã otp không đúng hoặc đã hết hạn', path: 'code' }])
  }
}

export class EmailAlreadyExistsAndCannotSendOtpException extends UnprocessableEntityException {
  constructor() {
    super([{ message: 'Email đã được đăng ký, không thể gửi mã otp', path: 'code' }])
  }
}

export class OTPAwaitTimeExpiredException extends UnprocessableEntityException {
  constructor() {
    super([{ message: 'Vui lòng chờ 1 phút để gửi lại', path: 'code' }])
  }
}
