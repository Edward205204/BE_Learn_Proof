import { NotFoundException } from '@nestjs/common'

export class CourseNotFoundException extends NotFoundException {
  constructor() {
    super('Khóa học không tồn tại')
  }
}
