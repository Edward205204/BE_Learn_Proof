import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Req,
} from '@nestjs/common'
import { QuizService } from './quiz.service'
import {
  CreateQuizBodyType,
  UpdateQuizBodyType,
  AddQuestionBodyType,
  SubmitQuizBodyType,
} from './quiz.model'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // Create Quiz
  @Post()
  async createQuiz(@Body() body: CreateQuizBodyType, @ActiveUser() user: TokenPayload) {
    return this.quizService.createQuiz(body, user.userId)
  }

  // Update Quiz
  @Patch(':id')
  async updateQuiz(
    @Param('id') quizId: string,
    @Body() body: UpdateQuizBodyType,
  ) {
    return this.quizService.updateQuiz(quizId, body)
  }

  // Delete Quiz
  @Delete(':id')
  async deleteQuiz(@Param('id') quizId: string) {
    return this.quizService.deleteQuiz(quizId)
  }

  // Get Quiz Detail
  @Get(':id')
  async getQuiz(@Param('id') quizId: string) {
    return this.quizService.getQuizById(quizId)
  }

  // Get Quiz by Lesson
  @Get('lesson/:lessonId')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    return this.quizService.getQuizByLesson(lessonId)
  }

  // Add Question
  @Post('question')
  async addQuestion(@Body() body: AddQuestionBodyType) {
    return this.quizService.addQuestion(body)
  }

  // Update Question
  @Patch('question/:id')
  async updateQuestion(
    @Param('id') questionId: string,
    @Body() body: AddQuestionBodyType,
  ) {
    return this.quizService.updateQuestion(questionId, body)
  }

  // Delete Question
  @Delete('question/:id')
  async deleteQuestion(@Param('id') questionId: string) {
    return this.quizService.deleteQuestion(questionId)
  }

  // Submit Quiz
  @Post('submit')
  async submitQuiz(
    @Req() req,
    @Body() body: SubmitQuizBodyType,
  ) {
    const userId = req.user?.userId
    return this.quizService.submitQuiz(userId, body)
  }
}