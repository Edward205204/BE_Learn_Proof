import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { QuizCmsService } from './quiz-cms.service'
import { QuizLearnerService } from './quiz-learner.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { AddQuestionDto, AddAnswerDto, EditContentDto, ChooseCorrectAnswerDto, SubmitQuizDto } from './quiz.dto'

@Controller('quiz')
@ApiBearerAuth('access-token')
export class QuizController {
  constructor(
    private readonly quizCmsService: QuizCmsService,
    private readonly quizLearnerService: QuizLearnerService,
  ) {}

  // CMS

  @Post(':quizId/questions')
  addQuestion(@Param('quizId') quizId: string, @Body() body: AddQuestionDto, @ActiveUser() user: TokenPayload) {
    return this.quizCmsService.addQuestionForQuiz(quizId, body, user.userId)
  }

  @Patch(':quizId/questions/:questionId')
  editQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() body: EditContentDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.editQuestion(questionId, body.content, user.userId, quizId)
  }

  @Delete(':quizId/questions/:questionId')
  deleteQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.deleteQuestionFromQuiz(questionId, user.userId, quizId)
  }

  @Post(':quizId/questions/:questionId/answers')
  addAnswer(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() body: AddAnswerDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.addAnswerForQuestion(questionId, body.content, user.userId, quizId)
  }

  @Patch(':quizId/questions/:questionId/answers/:answerId')
  editAnswer(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @Body() body: EditContentDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.editAnswer(answerId, questionId, body.content, user.userId, quizId)
  }

  @Delete(':quizId/questions/:questionId/answers/:answerId')
  deleteAnswer(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.deleteAnswer(questionId, answerId, user.userId, quizId)
  }

  @Patch(':quizId/questions/:questionId/correct-answer')
  chooseCorrectAnswer(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() body: ChooseCorrectAnswerDto,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.chooseCorrectAnswer(questionId, body.answerId, user.userId, quizId)
  }

  @Patch(':quizId/questions/:questionId/finish')
  finishEditQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizCmsService.finishEditQuestion(questionId, user.userId, quizId)
  }

  @Delete(':quizId')
  deleteQuiz(@Param('quizId') quizId: string, @ActiveUser() user: TokenPayload) {
    return this.quizCmsService.deleteQuiz(quizId, user.userId)
  }

  // Learner

  @Post(':quizId/submit')
  submitQuiz(@Param('quizId') quizId: string, @Body() body: SubmitQuizDto, @ActiveUser() user: TokenPayload) {
    return this.quizLearnerService.submitQuiz(user.userId, quizId, body.submission)
  }

  @Get(':quizId/check-answer/:questionId')
  checkAnswer(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @ActiveUser() user: TokenPayload,
  ) {
    return this.quizLearnerService.checkAnswer(questionId, user.userId, quizId)
  }

  @Get(':quizId/result')
  getQuizResult(@Param('quizId') quizId: string, @ActiveUser() user: TokenPayload) {
    return this.quizLearnerService.getQuizResult(user.userId, quizId)
  }
}
