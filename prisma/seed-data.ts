import { PrismaClient } from '../src/generated/prisma/client'
import { LessonType, VideoProviderEnum } from '../src/generated/prisma/enums'

type TemplateLesson = {
  title: string
  type: (typeof LessonType)[keyof typeof LessonType]
  duration?: number
  videoId?: string
  textContent?: string
  quizData?: {
    question: string
    answers: { content: string; isCorrect: boolean }[]
  }[]
}

type TemplateChapter = {
  title: string
  lessons: TemplateLesson[]
}

const getCategoryTemplates = (categorySlug: string): TemplateChapter[] => {
  const genericVideoId = 'dQw4w9WgXcQ'
  const genericTextContent = `Đây là nội dung bài học chi tiết. Trong bài học này, bạn sẽ được tìm hiểu các khái niệm cốt lõi, cách áp dụng vào thực tế và các lưu ý quan trọng.
Hãy đọc kỹ tài liệu, ghi chú lại những điểm chính và thực hành ngay sau khi học xong. Nếu có thắc mắc, hãy tham gia thảo luận cùng mọi người.`

  const blockchainTemplates: TemplateChapter[] = [
    {
      title: 'Chương 1: Tổng quan & Cơ bản',
      lessons: [
        { title: 'Giới thiệu chung', type: LessonType.VIDEO, duration: 600, videoId: genericVideoId },
        { title: 'Các khái niệm cốt lõi', type: LessonType.TEXT, textContent: genericTextContent },
        {
          title: 'Quiz: Ôn tập cơ bản',
          type: LessonType.QUIZ,
          quizData: [
            {
              question: 'Công nghệ nào đứng sau tiền điện tử?',
              answers: [
                { content: 'Blockchain', isCorrect: true },
                { content: 'AI', isCorrect: false },
                { content: 'Cloud', isCorrect: false },
                { content: 'IoT', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Chương 2: Thực hành & Nâng cao',
      lessons: [
        { title: 'Hướng dẫn cài đặt', type: LessonType.VIDEO, duration: 900, videoId: genericVideoId },
        { title: 'Ví dụ thực tế', type: LessonType.TEXT, textContent: genericTextContent },
        {
          title: 'Quiz: Đánh giá thực hành',
          type: LessonType.QUIZ,
          quizData: [
            {
              question: 'Đâu không phải là tính chất của Blockchain?',
              answers: [
                { content: 'Tập trung', isCorrect: true },
                { content: 'Bảo mật', isCorrect: false },
                { content: 'Minh bạch', isCorrect: false },
                { content: 'Bất biến', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  ]

  const defaultTemplates: TemplateChapter[] = [
    {
      title: 'Chương 1: Khởi đầu',
      lessons: [
        { title: 'Lộ trình học tập chi tiết', type: LessonType.VIDEO, duration: 300, videoId: genericVideoId },
        { title: 'Tài liệu tham khảo', type: LessonType.TEXT, textContent: genericTextContent },
      ],
    },
    {
      title: 'Chương 2: Kiến thức nền tảng',
      lessons: [
        { title: 'Bài giảng lý thuyết', type: LessonType.VIDEO, duration: 1200, videoId: genericVideoId },
        { title: 'Bài tập áp dụng', type: LessonType.TEXT, textContent: genericTextContent },
        {
          title: 'Quiz kiểm tra nền tảng',
          type: LessonType.QUIZ,
          quizData: [
            {
              question: 'Mục đích của việc học kiến thức nền tảng là gì?',
              answers: [
                { content: 'Xây dựng móng vững chắc', isCorrect: true },
                { content: 'Học cho nhanh', isCorrect: false },
                { content: 'Bỏ qua lý thuyết', isCorrect: false },
                { content: 'Chỉ thực hành', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Chương 3: Tổng kết & Thực chiến',
      lessons: [
        { title: 'Thực hành cuối khóa', type: LessonType.VIDEO, duration: 1500, videoId: genericVideoId },
        {
          title: 'Quiz: Đánh giá năng lực',
          type: LessonType.QUIZ,
          quizData: [
            {
              question: 'Bước tiếp theo sau khi hoàn thành khóa học?',
              answers: [
                { content: 'Áp dụng vào dự án thực tế', isCorrect: true },
                { content: 'Dừng lại không học nữa', isCorrect: false },
                { content: 'Quên hết kiến thức', isCorrect: false },
                { content: 'Chỉ đọc lại lý thuyết', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  ]

  if (categorySlug === 'blockchain' || categorySlug === 'web3' || categorySlug === 'smart-contract') {
    return blockchainTemplates
  }
  return defaultTemplates
}

export async function createCourseContent(prisma: PrismaClient, courseId: string, categorySlug: string) {
  const chapters = getCategoryTemplates(categorySlug)

  let chapterOrder = 1
  for (const chapterData of chapters) {
    const chapter = await prisma.chapter.create({
      data: {
        title: chapterData.title,
        order: chapterOrder++,
        courseId: courseId,
      },
    })

    let lessonOrder = 1
    for (const lessonData of chapterData.lessons) {
      const lesson = await prisma.lesson.create({
        data: {
          title: lessonData.title,
          type: lessonData.type,
          order: lessonOrder++,
          chapterId: chapter.id,
          duration: lessonData.duration,
          videoId: lessonData.videoId,
          provider: lessonData.videoId ? VideoProviderEnum.YOUTUBE : undefined,
          textContent: lessonData.textContent,
        },
      })

      if (lessonData.type === LessonType.QUIZ && lessonData.quizData) {
        const quiz = await prisma.quiz.create({
          data: { lessonId: lesson.id },
        })

        for (const q of lessonData.quizData) {
          const question = await prisma.question.create({
            data: {
              content: q.question,
              quizId: quiz.id,
            },
          })

          await prisma.answer.createMany({
            data: q.answers.map((ans) => ({
              content: ans.content,
              isCorrect: ans.isCorrect,
              questionId: question.id,
            })),
          })
        }
      }
    }
  }
}
