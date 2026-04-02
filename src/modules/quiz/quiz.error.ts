import { NotFoundException } from '@nestjs/common'

export class QuizNotFoundException extends NotFoundException {
  constructor() {
    super('Quiz not found')
  }
}

export class LessonNotFoundException extends NotFoundException {
  constructor() {
    super('Lesson not found')
  }
}

export class QuestionNotFoundException extends NotFoundException {
  constructor() {
    super('Question not found')
  }
}
