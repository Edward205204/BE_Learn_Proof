import { randomInt } from 'crypto'

export const generateOTP = (): string => {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

export const ADMIN_EMAILS = ['t.vinh.1109z@gmail.com']
