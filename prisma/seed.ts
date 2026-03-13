import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role, CourseLevel, CourseStatus, LessonType } from 'src/generated/prisma/client'
import envConfig from 'src/shared/config'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: envConfig.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('--- Đang xóa dữ liệu cũ ---')
  await prisma.courseDailySnapshot.deleteMany()
  await prisma.courseOverallAnalytics.deleteMany()
  await prisma.lessonAnalyticsSnapshot.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.question.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.chapter.deleteMany()
  await prisma.course.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // 1. Tạo Giảng viên
  const instructor = await prisma.user.create({
    data: {
      email: 'instructor@lms.com',
      password: 'hashed_password_here',
      fullName: 'Giảng viên Chuyên nghiệp',
      role: Role.CONTENT_MANAGER,
    },
  })

  // 2. Tạo nhiều Categories để phân loại
  const categoriesData = [
    { name: 'Frontend Development', slug: 'frontend' },
    { name: 'Backend Development', slug: 'backend' },
    { name: 'Mobile App', slug: 'mobile' },
    { name: 'Data Science & AI', slug: 'data-ai' },
    { name: 'Soft Skills', slug: 'soft-skills' },
  ]

  const categories = await Promise.all(
    categoriesData.map((cat) => prisma.category.create({ data: cat }))
  )

  // 3. Tạo 30 Khóa học mẫu
  console.log('--- Đang tạo 30 khóa học... ---')
  
  const levels = [CourseLevel.BEGINNER, CourseLevel.INTERMEDIATE, CourseLevel.ADVANCED]
  const statuses = [CourseStatus.PUBLISHED, CourseStatus.DRAFT]

  for (let i = 1; i <= 30; i++) {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]
    const randomLevel = levels[Math.floor(Math.random() * levels.length)]
    const randomStatus = statuses[i % 5 === 0 ? 1 : 0] // Cứ 5 bài thì có 1 bài Draft
    const price = Math.floor(Math.random() * 10) * 100000 + 199000 // Giá từ 199k đến 1tr1

    const course = await prisma.course.create({
      data: {
        title: `Khóa học chuyên sâu số ${i}: Master ${randomCategory.name}`,
        slug: `khoa-hoc-so-${i}-${randomCategory.slug}`,
        shortDesc: `Mô tả ngắn gọn cho khóa học thứ ${i}. Đây là kiến thức thực chiến.`,
        fullDesc: `Nội dung chi tiết của khóa học ${i}. Bao gồm đầy đủ tài liệu và bài tập...`,
        level: randomLevel,
        status: randomStatus,
        price: price,
        isFree: i % 10 === 0, // Cứ 10 bài có 1 bài miễn phí
        categoryId: randomCategory.id,
        creatorId: instructor.id,
        thumbnail: `https://picsum.photos/seed/${i + 100}/800/450`, // Ảnh ngẫu nhiên
        
        // Tạo Analytics giả lập cho từng khóa
        overallAnalytics: {
          create: {
            totalStudents: Math.floor(Math.random() * 500),
            totalRevenue: Math.floor(Math.random() * 100000000),
            avgRating: parseFloat((Math.random() * (5 - 3.5) + 3.5).toFixed(1)), // Rating từ 3.5 đến 5.0
            avgInterestScore: Math.floor(Math.random() * 100),
            dropoutRate: Math.floor(Math.random() * 20),
            completionRate: Math.floor(Math.random() * 40 + 10),
          },
        },
        
        // Mỗi khóa tạo sẵn 1 Chapter và 2 Lessons để test luồng học
        chapters: {
          create: {
            title: 'Chương 1: Giới thiệu tổng quan',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Bài 1: Lộ trình học tập',
                  type: LessonType.VIDEO,
                  order: 1,
                  duration: 300,
                  analytics: { create: { totalViews: 1000, avgWatchTime: 200, dropOffCount: 10 } }
                },
                {
                  title: 'Bài 2: Thực hành cơ bản',
                  type: LessonType.TEXT,
                  order: 2,
                  textContent: 'Nội dung bài học chữ...',
                }
              ]
            }
          }
        }
      },
    })
    
    // Tạo thêm dữ liệu biểu đồ cho 7 ngày gần nhất cho mỗi khóa học
    const today = new Date()
    for (let day = 0; day < 7; day++) {
      const date = new Date()
      date.setDate(today.getDate() - day)
      await prisma.courseDailySnapshot.create({
        data: {
          courseId: course.id,
          date: date,
          newEnrollments: Math.floor(Math.random() * 10),
          revenueToday: Math.floor(Math.random() * 2000000),
          activeLearners: Math.floor(Math.random() * 50),
        }
      })
    }
  }

  console.log('--- Seed 30 khóa học thành công! ---')
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })