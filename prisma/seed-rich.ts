import { PrismaClient } from '../src/generated/prisma/client'
import { Role, CourseLevel, CourseStatus, LessonType, VideoProviderEnum } from '../src/generated/prisma/enums'
import { hash } from 'bcrypt'

// ─── LEARNERS ────────────────────────────────────────────────────────────────
const LEARNERS_DATA = [
  { email: 'nguyen.vana@gmail.com', fullName: 'Nguyễn Văn An', bio: 'Sinh viên IT năm 3, đam mê lập trình backend.' },
  { email: 'tran.thib@gmail.com', fullName: 'Trần Thị Bình', bio: 'Fresher frontend, đang học React và TypeScript.' },
  { email: 'le.vanhung@gmail.com', fullName: 'Lê Văn Hùng', bio: 'Junior developer tại công ty phần mềm Đà Nẵng.' },
  { email: 'pham.thidung@gmail.com', fullName: 'Phạm Thị Dung', bio: 'Học lập trình để chuyển ngành từ kế toán.' },
  {
    email: 'hoang.vanminh@gmail.com',
    fullName: 'Hoàng Văn Minh',
    bio: 'Backend developer 2 năm kinh nghiệm, muốn học Mobile.',
  },
  { email: 'vo.thilan@gmail.com', fullName: 'Võ Thị Lan', bio: 'Sinh viên CNTT, thích xây dựng ứng dụng mobile.' },
  {
    email: 'dang.vantuan@gmail.com',
    fullName: 'Đặng Văn Tuấn',
    bio: 'Tự học lập trình online, đang chuẩn bị đi phỏng vấn.',
  },
  {
    email: 'bui.thihoa@gmail.com',
    fullName: 'Bùi Thị Hoa',
    bio: 'Kỹ sư phần mềm 3 năm, muốn nâng cao kỹ năng NestJS.',
  },
  {
    email: 'do.vankhanh@gmail.com',
    fullName: 'Đỗ Văn Khánh',
    bio: 'Freelancer chuyên React Native, tìm hiểu thêm backend.',
  },
  {
    email: 'nguyen.thilinh@gmail.com',
    fullName: 'Nguyễn Thị Linh',
    bio: 'Học lập trình để startup, quan tâm đến full-stack.',
  },
  {
    email: 'trinh.vanlong@gmail.com',
    fullName: 'Trịnh Văn Long',
    bio: 'DevOps engineer muốn mở rộng sang backend development.',
  },
  { email: 'ly.thimong@gmail.com', fullName: 'Lý Thị Mộng', bio: 'Sinh viên năm 4, chuẩn bị tốt nghiệp và tìm việc.' },
]

// ─── EXTRA INSTRUCTORS ────────────────────────────────────────────────────────
const EXTRA_INSTRUCTORS_DATA = [
  {
    email: 'tran.tiendat@gmail.com',
    fullName: 'Trần Tiến Đạt',
    bio: 'Senior Frontend Engineer 6 năm kinh nghiệm. Chuyên React, Vue và kiến trúc ứng dụng web hiện đại.',
    headline: 'Senior Frontend Engineer | React & Vue Expert',
    courses: [
      {
        title: 'React Hooks & Context API Chuyên Sâu',
        slug: 'react-hooks-context-api',
        shortDesc:
          'Nắm vững useState, useEffect, useContext, useReducer và các pattern quản lý state hiện đại trong React.',
        categorySlug: 'frontend',
        level: CourseLevel.INTERMEDIATE,
        price: 299000,
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
      },
      {
        title: 'TypeScript Từ Zero Đến Hero',
        slug: 'typescript-zero-to-hero',
        shortDesc: 'Học TypeScript bài bản: types, interfaces, generics, decorators và tích hợp vào dự án React/Node.',
        categorySlug: 'frontend',
        level: CourseLevel.BEGINNER,
        price: 249000,
        thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
      },
      {
        title: 'Next.js Full-Stack Development',
        slug: 'nextjs-fullstack-dev',
        shortDesc: 'Xây dựng ứng dụng full-stack với Next.js 14: App Router, Server Actions, API Routes và deployment.',
        categorySlug: 'frontend',
        level: CourseLevel.ADVANCED,
        price: 399000,
        thumbnail: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800&q=80',
      },
      {
        title: 'Vue.js 3 Thực Chiến',
        slug: 'vuejs3-thuc-chien',
        shortDesc: 'Composition API, Pinia state management và xây dựng SPA thực tế với Vue 3.',
        categorySlug: 'frontend',
        level: CourseLevel.INTERMEDIATE,
        price: 279000,
        thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&q=80',
      },
    ],
  },
  {
    email: 'nguyen.huuthanh@gmail.com',
    fullName: 'Nguyễn Hữu Thành',
    bio: 'Data Engineer & ML Practitioner với 5 năm kinh nghiệm. Chuyên Python, TensorFlow và xây dựng data pipeline.',
    headline: 'Data Engineer | ML Practitioner | Python Expert',
    courses: [
      {
        title: 'Python Cho Data Science',
        slug: 'python-data-science',
        shortDesc: 'NumPy, Pandas, Matplotlib và các kỹ thuật phân tích dữ liệu thực tế với Python.',
        categorySlug: 'data-ai',
        level: CourseLevel.BEGINNER,
        price: 299000,
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
      },
      {
        title: 'Machine Learning Thực Chiến',
        slug: 'machine-learning-thuc-chien',
        shortDesc: 'Regression, Classification, Clustering và Neural Networks với scikit-learn và TensorFlow.',
        categorySlug: 'data-ai',
        level: CourseLevel.INTERMEDIATE,
        price: 499000,
        thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
      },
      {
        title: 'SQL Nâng Cao & Database Design',
        slug: 'sql-nang-cao-database-design',
        shortDesc: 'Window functions, CTEs, query optimization và thiết kế schema chuẩn cho ứng dụng thực tế.',
        categorySlug: 'data-ai',
        level: CourseLevel.INTERMEDIATE,
        price: 199000,
        thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
      },
    ],
  },
]

// ─── REVIEW POOL ─────────────────────────────────────────────────────────────
const REVIEW_POOL: Record<number, string[]> = {
  5: [
    'Khóa học xuất sắc! Giảng viên giải thích rõ ràng, từng bước một. Tôi đã apply được ngay vào dự án thực tế sau khi hoàn thành.',
    'Nội dung cực kỳ chất lượng, cấu trúc bài học logic và dễ follow. Highly recommend cho ai muốn nắm chắc kiến thức này!',
    'Tuyệt vời! Đây là khóa học tốt nhất tôi từng học. Giảng viên có kinh nghiệm thực tế và biết cách truyền đạt hiệu quả.',
    'Giá trị vượt xa số tiền bỏ ra. Tôi đã phỏng vấn thành công nhờ kiến thức học được từ khóa này.',
    'Rất hài lòng! Bài tập thực hành phong phú, giảng viên nhiệt tình hỗ trợ học viên.',
  ],
  4: [
    'Khóa học tốt, nội dung đầy đủ và cập nhật. Chỉ mong có thêm bài tập thực hành phức tạp hơn.',
    'Học được nhiều kiến thức hữu ích. Giảng viên giải thích rõ, video chất lượng tốt.',
    'Nội dung tốt, phù hợp với người mới bắt đầu. Một vài chỗ cần giải thích thêm nhưng nhìn chung rất ổn.',
    'Khóa học chất lượng, đáng đồng tiền. Sẽ giới thiệu cho bạn bè cùng học.',
    'Giảng viên nhiệt tình, bài học có cấu trúc rõ ràng. Mong có thêm project thực tế cuối khóa.',
  ],
  3: [
    'Khóa học ở mức trung bình. Kiến thức cơ bản nhưng cần thêm ví dụ thực tế để dễ hiểu hơn.',
    'Nội dung ổn nhưng tốc độ giảng hơi nhanh ở một số phần. Cần xem lại nhiều lần mới hiểu.',
    'Được một nửa. Phần đầu tốt nhưng phần nâng cao cần bổ sung thêm nội dung.',
  ],
}

// ─── DISCUSSION POOL ─────────────────────────────────────────────────────────
const DISCUSSION_POOL = [
  { content: 'Cho mình hỏi phần này có liên quan đến bài tiếp theo không ạ? Mình đang bị mắc ở chỗ setup ban đầu.' },
  { content: 'Mình đã thực hành theo video nhưng gặp lỗi "Cannot find module". Bạn nào gặp trường hợp này chưa?' },
  {
    content: 'Giảng viên có thể giải thích thêm về phần này không ạ? Mình vẫn chưa hiểu rõ tại sao lại dùng cách này.',
  },
  { content: 'Bài học này quá hay! Mình đã áp dụng được vào project của công ty rồi. Cảm ơn thầy nhiều ạ!' },
  { content: 'Có ai biết tài liệu tham khảo thêm về chủ đề này không? Mình muốn đào sâu thêm.' },
  {
    content:
      'Mình đang gặp lỗi TypeScript khi làm theo bài. Error: Type "string" is not assignable to type "number". Xử lý thế nào ạ?',
  },
  { content: 'Khóa học rất bổ ích! Mình đã hoàn thành 80% và cảm thấy tự tin hơn rất nhiều.' },
]

const REPLY_POOL = [
  'Chào bạn! Bạn có thể kiểm tra lại phiên bản Node.js nhé. Mình cũng gặp vấn đề tương tự và fix được rồi.',
  'Bạn thử chạy npm install lại xem sao, có thể thiếu dependency đó.',
  'Mình hiểu rồi! Cảm ơn bạn đã hỏi, thầy sẽ giải thích thêm trong video tiếp theo nhé.',
  'Bạn đọc phần documentation chính thức nhé, mình để link ở phần mô tả bài học.',
  'Vấn đề này khá phổ biến. Hãy đảm bảo bạn đang dùng đúng phiên bản như trong video.',
]

// ─── CHAPTER TEMPLATES FOR EXTRA INSTRUCTORS ─────────────────────────────────
function buildFrontendChapters(categorySlug: string) {
  return [
    {
      title: 'Chương 1: Nền Tảng & Môi Trường',
      lessons: [
        { title: 'Giới thiệu khóa học và lộ trình', type: LessonType.VIDEO, videoId: 'Tn6-PIqc4UM', duration: 600 },
        { title: 'Cài đặt và cấu hình môi trường', type: LessonType.VIDEO, videoId: 'fis26HvvDII', duration: 900 },
        {
          title: 'Tài liệu tham khảo và resources',
          type: LessonType.TEXT,
          textContent: 'Danh sách tài liệu và resources quan trọng cho khóa học này...',
        },
      ],
    },
    {
      title: 'Chương 2: Kiến Thức Cốt Lõi',
      lessons: [
        { title: 'Các khái niệm cơ bản cần nắm', type: LessonType.VIDEO, videoId: 'SqcY0GlETPk', duration: 1200 },
        { title: 'Thực hành: Project đầu tay', type: LessonType.VIDEO, videoId: 'w7ejDZ8SWv8', duration: 1800 },
        {
          title: 'Quiz: Kiểm tra kiến thức chương 2',
          type: LessonType.QUIZ,
          quizData: [
            {
              question: 'Khái niệm nào quan trọng nhất trong chương này?',
              answers: [
                { content: 'Component lifecycle', isCorrect: true },
                { content: 'CSS Grid', isCorrect: false },
                { content: 'HTTP methods', isCorrect: false },
                { content: 'SQL joins', isCorrect: false },
              ],
            },
            {
              question: 'Pattern nào được khuyến nghị cho state management?',
              answers: [
                { content: 'Unidirectional data flow', isCorrect: true },
                { content: 'Two-way binding', isCorrect: false },
                { content: 'Global variables', isCorrect: false },
                { content: 'Local storage only', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Chương 3: Nâng Cao & Thực Chiến',
      lessons: [
        {
          title: 'Best practices và performance optimization',
          type: LessonType.VIDEO,
          videoId: 'dpw9EHDh2bM',
          duration: 1500,
        },
        { title: 'Xây dựng project thực tế', type: LessonType.VIDEO, videoId: 'XhJoEKyBm-Y', duration: 2400 },
        {
          title: 'Deploy và CI/CD cơ bản',
          type: LessonType.TEXT,
          textContent: 'Hướng dẫn deploy ứng dụng lên Vercel/Netlify và thiết lập CI/CD...',
        },
      ],
    },
  ]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickReview(rating: number): string {
  const pool = REVIEW_POOL[rating] ?? REVIEW_POOL[3]
  return pickRandom(pool)
}

// ─── MAIN ENRICHMENT FUNCTION ────────────────────────────────────────────────
export async function seedRichDemo(prisma: PrismaClient, specialInstructorId: string, specialCourseIds: string[]) {
  const saltRounds = 10
  const defaultPassword = await hash('123456@Aa', saltRounds)

  console.log('  [rich] Tạo learners...')
  const learners = await Promise.all(
    LEARNERS_DATA.map((l) =>
      prisma.user.upsert({
        where: { email: l.email },
        update: {},
        create: { email: l.email, password: defaultPassword, fullName: l.fullName, bio: l.bio, role: Role.LEARNER },
      }),
    ),
  )

  console.log('  [rich] Tạo extra instructors + courses...')
  const extraInstructorIds: string[] = []
  const extraCourseIds: string[] = []

  for (const instrData of EXTRA_INSTRUCTORS_DATA) {
    const instr = await prisma.user.upsert({
      where: { email: instrData.email },
      update: {},
      create: {
        email: instrData.email,
        password: defaultPassword,
        fullName: instrData.fullName,
        bio: instrData.bio,
        headline: instrData.headline,
        role: Role.CONTENT_MANAGER,
      },
    })
    extraInstructorIds.push(instr.id)

    for (const courseData of instrData.courses) {
      const existing = await prisma.course.findUnique({ where: { slug: courseData.slug } })
      if (existing) {
        extraCourseIds.push(existing.id)
        continue
      }

      const cat = await prisma.category.upsert({
        where: { slug: courseData.categorySlug },
        update: {},
        create: { name: courseData.categorySlug, slug: courseData.categorySlug },
      })

      const course = await prisma.course.create({
        data: {
          title: courseData.title,
          slug: courseData.slug,
          shortDesc: courseData.shortDesc,
          level: courseData.level,
          status: CourseStatus.PUBLISHED,
          price: courseData.price,
          isFree: courseData.price === 0,
          thumbnail: courseData.thumbnail,
          categoryId: cat.id,
          creatorId: instr.id,
          avgRating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
          totalReviews: Math.floor(Math.random() * 80 + 20),
        },
      })
      extraCourseIds.push(course.id)

      // Tạo chapters + lessons từ template
      const chapters = buildFrontendChapters(courseData.categorySlug)
      let chapterOrder = 1
      for (const ch of chapters) {
        const chapter = await prisma.chapter.create({
          data: { title: ch.title, order: chapterOrder++, courseId: course.id },
        })
        let lessonOrder = 1
        for (const l of ch.lessons) {
          const lesson = await prisma.lesson.create({
            data: {
              title: l.title,
              type: l.type,
              order: lessonOrder++,
              chapterId: chapter.id,
              videoId: (l as any).videoId,
              provider: (l as any).videoId ? VideoProviderEnum.YOUTUBE : undefined,
              duration: (l as any).duration,
              textContent: (l as any).textContent,
            },
          })
          if (l.type === LessonType.QUIZ && (l as any).quizData) {
            const quiz = await prisma.quiz.create({ data: { lessonId: lesson.id } })
            for (const q of (l as any).quizData) {
              const question = await prisma.question.create({ data: { content: q.question, quizId: quiz.id } })
              await prisma.answer.createMany({ data: q.answers.map((a: any) => ({ ...a, questionId: question.id })) })
            }
          }
        }
      }
    }
  }

  const allCourseIds = [...specialCourseIds, ...extraCourseIds]

  console.log('  [rich] Tạo enrollments...')
  for (const learner of learners) {
    // Mỗi learner học 4-8 khóa ngẫu nhiên
    const count = Math.floor(Math.random() * 5) + 4
    const shuffled = [...allCourseIds].sort(() => Math.random() - 0.5).slice(0, count)
    for (const courseId of shuffled) {
      await prisma.enrollment
        .upsert({
          where: { userId_courseId: { userId: learner.id, courseId } },
          update: {},
          create: { userId: learner.id, courseId },
        })
        .catch(() => {})
    }
  }

  console.log('  [rich] Tạo reviews...')
  // Lấy tất cả enrollments hiện tại để tạo review
  const enrollments = await prisma.enrollment.findMany({ take: 200 })
  const reviewed = new Set<string>()
  for (const enr of enrollments) {
    const key = `${enr.userId}_${enr.courseId}`
    if (reviewed.has(key)) continue
    reviewed.add(key)
    // 70% xác suất có review
    if (Math.random() > 0.7) continue
    const rating = Math.random() < 0.5 ? 5 : Math.random() < 0.6 ? 4 : 3
    await prisma.review
      .upsert({
        where: { userId_courseId: { userId: enr.userId, courseId: enr.courseId } },
        update: {},
        create: {
          userId: enr.userId,
          courseId: enr.courseId,
          rating,
          comment: pickReview(rating),
        },
      })
      .catch(() => {})
  }

  console.log('  [rich] Tạo progress...')
  // Lấy các lessons của special courses để tạo progress
  const lessons = await prisma.lesson.findMany({
    where: { chapter: { courseId: { in: specialCourseIds.slice(0, 4) } } },
    take: 100,
  })
  for (const learner of learners.slice(0, 6)) {
    for (const lesson of lessons.slice(0, Math.floor(Math.random() * 10) + 3)) {
      await prisma.progress
        .upsert({
          where: { userId_lessonId: { userId: learner.id, lessonId: lesson.id } },
          update: {},
          create: {
            userId: learner.id,
            lessonId: lesson.id,
            isCompleted: Math.random() > 0.3,
          },
        })
        .catch(() => {})
    }
  }

  console.log('  [rich] Tạo discussions...')
  const discussableLessons = await prisma.lesson.findMany({
    where: {
      type: LessonType.VIDEO,
      chapter: { courseId: { in: specialCourseIds.slice(0, 2) } },
    },
    include: { chapter: { include: { course: true } } },
    take: 10,
  })

  for (const lesson of discussableLessons) {
    const courseId = lesson.chapter.courseId
    // 1-2 discussions mỗi bài
    const numDiscussions = Math.floor(Math.random() * 2) + 1
    for (let i = 0; i < numDiscussions; i++) {
      const author = pickRandom(learners)
      const disc = await prisma.discussion.create({
        data: {
          content: pickRandom(DISCUSSION_POOL).content,
          userId: author.id,
          courseId,
          lessonId: lesson.id,
        },
      })
      // 1-2 replies
      const numReplies = Math.floor(Math.random() * 2) + 1
      for (let r = 0; r < numReplies; r++) {
        const replier = pickRandom(learners.filter((l) => l.id !== author.id))
        await prisma.reply.create({
          data: { content: pickRandom(REPLY_POOL), discussionId: disc.id, userId: replier.id },
        })
      }
    }
  }

  // Cập nhật avgRating và totalReviews cho special courses
  for (const courseId of specialCourseIds) {
    const reviews = await prisma.review.findMany({ where: { courseId } })
    if (reviews.length === 0) continue
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    await prisma.course.update({
      where: { id: courseId },
      data: { avgRating: parseFloat(avg.toFixed(1)), totalReviews: reviews.length },
    })
  }

  console.log(
    `  [rich] Hoàn thành: ${learners.length} learners, ${EXTRA_INSTRUCTORS_DATA.length} instructors extra, ${extraCourseIds.length} extra courses`,
  )
}
