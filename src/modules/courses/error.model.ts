import { BadRequestException, NotFoundException } from '@nestjs/common'

export class CourseNotFoundException extends NotFoundException {
  constructor() {
    super('Khóa học không tồn tại')
  }
}

export class CategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Danh mục khóa học không tồn tại')
  }
}

export class CourseNotDraftException extends BadRequestException {
  constructor() {
    super('Không thể chỉnh cấu trúc khóa học khi không ở trạng thái nháp')
  }
}

export class CourseNotMatchException extends BadRequestException {
  constructor() {
    super('Không có quyền chỉnh sửa khóa học')
  }
}
