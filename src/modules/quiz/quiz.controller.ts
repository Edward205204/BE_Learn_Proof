import { Body, Controller, Post, Patch, Param } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { QuizService } from './quiz.service'
import { CreateQuizDto, UpdateQuizDto, AddQuestionDto, SubmitQuizDto } from './quiz.dto'

@Controller('quiz')
@ApiBearerAuth('access-token')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  createQuiz(@Body() body: CreateQuizDto) {
    return this.quizService.createQuiz(body, 'userId')
  }

  @Patch(':id')
  updateQuiz(@Param('id') id: string, @Body() body: UpdateQuizDto) {
    return this.quizService.updateQuiz(id, body)
  }

  @Post('question')
  addQuestion(@Body() body: AddQuestionDto) {
    return this.quizService.addQuestion(body)
  }

  @Post('submit')
  submitQuiz(@Body() body: SubmitQuizDto) {
    return this.quizService.submitQuiz('userId', body)
  }
}
