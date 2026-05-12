import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { LessonService } from '../modules/lesson/lesson.service'
import { QuizCmsService } from '../modules/quiz/quiz-cms.service'
import { PrismaService } from '../shared/services/prisma.service'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const prisma = app.get(PrismaService)
  const lessonService = app.get(LessonService)
  const quizCmsService = app.get(QuizCmsService)

  try {
    // 1. Setup a test lesson
    const lesson = await prisma.lesson.findFirst({
      include: { chapter: { include: { course: true } } },
    })
    if (!lesson) throw new Error('No lesson found')

    const courseId = lesson.chapter.course.id
    const userId = lesson.chapter.course.creatorId

    // Need to enroll the user to test askLesson
    const enroll = await prisma.enrollment.findFirst({ where: { userId, courseId } })
    if (!enroll) {
      await prisma.enrollment.create({
        data: {
          userId,
          courseId,
        },
      })
    }

    console.log('--- TEST 1: AI Q&A (RAG Ask) ---')
    try {
      const qaResult = await lessonService.askLesson(lesson.id, userId, 'What is this lesson about?')
      console.log('QA Result:', qaResult)
    } catch (err) {
      console.error('QA Error:', err)
    }

    console.log('\n--- TEST 2: AI Gen Quiz ---')
    try {
      const genResult = await quizCmsService.generateAiQuiz(lesson.id, userId)
      console.log('Quiz Gen Started, Job ID:', genResult.jobId)

      // Wait a bit for the queue processor
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const drafts = await quizCmsService.getDraftsByLesson(lesson.id, userId)
      console.log('Drafts:', drafts)
    } catch (err) {
      console.error('Quiz Gen Error:', err)
    }
  } finally {
    await app.close()
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap()
