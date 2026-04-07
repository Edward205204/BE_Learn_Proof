import { Injectable } from '@nestjs/common'
import { CreateLessonBodyType } from './lesson.model'
import { LessonRepo } from './lesson.repo'
import { LessonStrategyRegistry } from './strategies/lesson-strategy.registry'
// import { QuizService } from '../quiz/quiz-cms.service'

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly registry: LessonStrategyRegistry,
    // private readonly quizService: QuizService,
  ) {}

  // private async validateChapterAuthor(chapterId: string, userId: string) {
  //   const chapter = await this.lessonRepo.findChapterWithAuthorId({
  //     id: chapterId,
  //     authorId: userId,
  //   })
  //   if (!chapter) {
  //     throw new BadRequestException('Chapter not found or you are not the author of this chapter')
  //   }
  //   return chapter
  // }

  async createLesson(body: CreateLessonBodyType) {
    // await this.validateChapterAuthor(chapterId, userId)
    //  tạm ẩn bước này, vì nằm ngoài domain của lesson

    const lessonStrategy = this.registry.resolve(body.type)

    return lessonStrategy.create(body)
    // thêm tạo quiz ở đây
  }

  // private async createTextLesson(body: CreateLessonBodyType, order: number) {
  //   const { title, shortDesc, fullDesc, chapterId, textContent, quizData } = body

  //   const lesson = await this.lessonRepo.createLesson({
  //     type: 'TEXT',
  //     title,
  //     shortDesc: shortDesc ?? null,
  //     fullDesc: fullDesc ?? null,
  //     order,
  //     videoId: null,
  //     provider: null,
  //     duration: null,
  //     chapterId,
  //     textContent: textContent ?? null,
  //   })

  // return this.withOptionalQuiz(lesson, quizData)
  // }

  // private async withOptionalQuiz<T extends { id: string }>(
  //   lesson: T,
  //   quizData: { title?: string; description?: string } | undefined,
  // ) {
  //   if (!quizData) return { lesson, quizWarning: null }

  //   try {
  //     await this.quizService.createQuizForLesson(lesson.id, quizData)
  //     return { lesson, quizWarning: null }
  //   } catch {
  //     return {
  //       lesson,
  //       quizWarning: 'Tạo bài học thành công nhưng quá trình xử lý quiz có vấn đề, bạn có thể thêm lại sau.',
  //     }
  //   }
  // }

  // private createQuizLesson(body: CreateLessonBodyType, order: number) {
  //   const { title, shortDesc, fullDesc, chapterId, quizData } = body

  //   if (!quizData) {
  //     throw new BadRequestException('Chưa có dữ liệu câu hỏi cho bài kiểm tra.')
  //   }

  //   return this.lessonRepo.createLessonWithQuiz(
  //     {
  //       title,
  //       shortDesc: shortDesc ?? null,
  //       fullDesc: fullDesc ?? null,
  //       order,
  //       chapterId,
  //     },
  //     quizData,
  //   )
  // }
}
