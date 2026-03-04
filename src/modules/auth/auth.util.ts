import { randomInt } from 'crypto'

export const generateOTP = (): string => {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}
