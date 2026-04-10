import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

export class QuizNotFoundException extends NotFoundException {
  constructor() {
    super('Quiz not found')
  }
}

export class QuestionNotFoundException extends NotFoundException {
  constructor() {
    super('Question not found')
  }
}

export class QuestionNotInEditModeException extends ForbiddenException {
  constructor() {
    super('Không thể chỉnh sửa.')
  }
}

export class QuestionMissingCorrectAnswerException extends BadRequestException {
  constructor() {
    super('Câu hỏi cần ít nhất hai đáp án.')
  }
}

export class QuestionHasMultipleCorrectAnswersException extends BadRequestException {
  constructor() {
    super('Câu hỏi chỉ được có đúng một đáp án đúng.')
  }
}

export class QuizHasNoQuestionsException extends BadRequestException {
  constructor() {
    super('Quiz chưa có câu hỏi nào.')
  }
}
