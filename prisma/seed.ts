import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role, CourseLevel, CourseStatus, LessonType, VideoProvider } from 'src/generated/prisma/client'
import envConfig from 'src/shared/config'
import { Pool } from 'pg'
import { hash } from 'bcrypt'

const pool = new Pool({ connectionString: envConfig.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const contentManager = {
  email: 'nguyentminhkhoa1@gmail.com',
  password: '123456@Aa',
}
async function createContentManager() {
  const saltRounds = 10
  const hashedPassword = await hash(contentManager.password, saltRounds)
  return prisma.user.create({
    data: {
      email: contentManager.email,
      password: hashedPassword,
      fullName: 'Content Manager',
      role: Role.CONTENT_MANAGER,
    },
  })
}

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
  const instructor = await createContentManager()

  // 2. Tạo nhiều Categories để phân loại
  const categoriesData = [
    { name: 'Frontend Development', slug: 'frontend' },
    { name: 'Backend Development', slug: 'backend' },
    { name: 'Mobile App', slug: 'mobile' },
    { name: 'Data Science & AI', slug: 'data-ai' },
    { name: 'Soft Skills', slug: 'soft-skills' },
  ]

  const categories = await Promise.all(categoriesData.map((cat) => prisma.category.create({ data: cat })))

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
                  videoId: 'lQCRGJtCpVo',
                  type: LessonType.VIDEO,
                  provider: VideoProvider.YOUTUBE,
                  order: 1,
                  duration: 300,
                  analytics: { create: { totalViews: 1000, avgWatchTime: 200, dropOffCount: 10 } },
                },
                {
                  title: 'Bài 2: Thực hành cơ bản',
                  type: LessonType.TEXT,
                  order: 2,
                  textContent: 'Nội dung bài học chữ...',
                },
              ],
            },
          },
        },
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
        },
      })
    }
  }

  console.log('--- Seed 30 khóa học thành công! ---')

  // 4. Seed mock courses từ frontend data
  console.log('--- Đang tạo mock courses cho frontend ---')

  type MockCourseInput = {
    title: string
    slug: string
    thumbnail: string | null
    price: number
    originalPrice: number | null
    isFree: boolean
    level: (typeof CourseLevel)[keyof typeof CourseLevel]
    shortDesc: string
    createdAt: Date
    category: { name: string; slug: string }
    overallAnalytics: { avgRating: number; totalStudents: number; avgInterestScore: number } | null
  }

  const mockCoursesRaw: MockCourseInput[] = [
    // ── MOCK_TRENDING ──────────────────────────────────────────────────────────
    {
      title: 'Nền tảng Blockchain 2024',
      slug: 'nen-tang-blockchain-2024',
      thumbnail: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400&q=80',
      price: 49.99,
      originalPrice: 89.99,
      isFree: false,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Học Blockchain từ số 0 đến chuyên gia',
      createdAt: new Date('2024-11-01'),
      category: { name: 'Blockchain', slug: 'blockchain' },
      overallAnalytics: { avgRating: 4.8, totalStudents: 3200, avgInterestScore: 9.2 },
    },
    {
      title: 'Khám phá Web3',
      slug: 'kham-pha-web3',
      thumbnail: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&q=80',
      price: 64.99,
      originalPrice: null,
      isFree: false,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'DApp, Smart Contract và DeFi từ A-Z',
      createdAt: new Date('2024-10-15'),
      category: { name: 'Web3', slug: 'web3' },
      overallAnalytics: { avgRating: 4.7, totalStudents: 2150, avgInterestScore: 8.9 },
    },
    {
      title: 'Hợp đồng nâng cao',
      slug: 'hop-dong-nang-cao',
      thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80',
      price: 89.0,
      originalPrice: 129.0,
      isFree: false,
      level: CourseLevel.ADVANCED,
      shortDesc: 'Solidity nâng cao & Security Audit',
      createdAt: new Date('2024-09-20'),
      category: { name: 'Smart Contract', slug: 'smart-contract' },
      overallAnalytics: { avgRating: 4.9, totalStudents: 980, avgInterestScore: 9.5 },
    },
    {
      title: 'Giao dịch Crypto',
      slug: 'giao-dich-crypto',
      thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80',
      price: 39.99,
      originalPrice: 69.99,
      isFree: false,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Chiến lược giao dịch tiền điện tử',
      createdAt: new Date('2024-12-01'),
      category: { name: 'Trading', slug: 'trading' },
      overallAnalytics: { avgRating: 4.6, totalStudents: 5400, avgInterestScore: 8.7 },
    },
    {
      title: 'NFT & Metaverse',
      slug: 'nft-metaverse',
      thumbnail: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80',
      price: 0,
      originalPrice: null,
      isFree: true,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Tạo & bán NFT trên OpenSea',
      createdAt: new Date('2024-08-10'),
      category: { name: 'NFT', slug: 'nft' },
      overallAnalytics: { avgRating: 4.4, totalStudents: 8900, avgInterestScore: 8.5 },
    },

    // ── MOCK_TOP_SELLING ───────────────────────────────────────────────────────
    {
      title: 'Giao dịch Bitcoin',
      slug: 'giao-dich-bitcoin',
      thumbnail: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&q=80',
      price: 59.99,
      originalPrice: 99.99,
      isFree: false,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Mua bán Bitcoin an toàn & hiệu quả',
      createdAt: new Date('2024-07-01'),
      category: { name: 'Bitcoin', slug: 'bitcoin' },
      overallAnalytics: { avgRating: 4.7, totalStudents: 12000, avgInterestScore: 8.3 },
    },
    {
      title: 'Ethereum nâng cao',
      slug: 'ethereum-nang-cao',
      thumbnail: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&q=80',
      price: 74.99,
      originalPrice: null,
      isFree: false,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'EVM, Gas & Layer 2 Solutions',
      createdAt: new Date('2024-06-15'),
      category: { name: 'Ethereum', slug: 'ethereum' },
      overallAnalytics: { avgRating: 4.8, totalStudents: 9800, avgInterestScore: 8.9 },
    },
    {
      title: 'Newcomer Blockchain',
      slug: 'newcomer-blockchain',
      thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
      price: 0,
      originalPrice: null,
      isFree: true,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Bắt đầu từ con số 0',
      createdAt: new Date('2024-12-10'),
      category: { name: 'Blockchain', slug: 'blockchain' },
      overallAnalytics: { avgRating: 4.5, totalStudents: 7600, avgInterestScore: 7.9 },
    },
    {
      title: 'Giải thuật DeFi',
      slug: 'giai-thuat-defi',
      thumbnail: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400&q=80',
      price: 84.99,
      originalPrice: 129.99,
      isFree: false,
      level: CourseLevel.ADVANCED,
      shortDesc: 'Yield Farming, Liquidity & AMM',
      createdAt: new Date('2024-05-20'),
      category: { name: 'DeFi', slug: 'defi' },
      overallAnalytics: { avgRating: 4.9, totalStudents: 6200, avgInterestScore: 9.1 },
    },
    {
      title: 'Kỹ thuật Solidity',
      slug: 'ky-thuat-solidity',
      thumbnail: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=400&q=80',
      price: 69.0,
      originalPrice: 99.0,
      isFree: false,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'Lập trình Smart Contract chuyên sâu',
      createdAt: new Date('2024-04-01'),
      category: { name: 'Solidity', slug: 'solidity' },
      overallAnalytics: { avgRating: 4.6, totalStudents: 5100, avgInterestScore: 8.4 },
    },

    // ── MOCK_NEWEST ────────────────────────────────────────────────────────────
    {
      title: 'TON Blockchain 2025',
      slug: 'ton-blockchain-2025',
      thumbnail: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400&q=80',
      price: 54.99,
      originalPrice: null,
      isFree: false,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Xây dựng ứng dụng trên TON Network',
      createdAt: new Date('2025-01-15'),
      category: { name: 'TON', slug: 'ton' },
      overallAnalytics: { avgRating: 4.5, totalStudents: 320, avgInterestScore: 8.1 },
    },
    {
      title: 'AI + Web3 Integration',
      slug: 'ai-web3-integration',
      thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80',
      price: 79.99,
      originalPrice: 119.99,
      isFree: false,
      level: CourseLevel.ADVANCED,
      shortDesc: 'Kết hợp AI và công nghệ Blockchain',
      createdAt: new Date('2025-01-10'),
      category: { name: 'AI/Web3', slug: 'ai-web3' },
      overallAnalytics: { avgRating: 4.7, totalStudents: 210, avgInterestScore: 9.0 },
    },
    {
      title: 'ZK Proof Căn bản',
      slug: 'zk-proof-can-ban',
      thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80',
      price: 0,
      originalPrice: null,
      isFree: true,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'Zero-Knowledge Proof từ đầu',
      createdAt: new Date('2025-01-05'),
      category: { name: 'Cryptography', slug: 'cryptography' },
      overallAnalytics: { avgRating: 4.6, totalStudents: 180, avgInterestScore: 8.7 },
    },
    {
      title: 'Multi-Chain Wallet Dev',
      slug: 'multi-chain-wallet-dev',
      thumbnail: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&q=80',
      price: 69.99,
      originalPrice: null,
      isFree: false,
      level: CourseLevel.ADVANCED,
      shortDesc: 'Xây dựng ví đa chuỗi với React',
      createdAt: new Date('2024-12-28'),
      category: { name: 'Development', slug: 'development' },
      overallAnalytics: { avgRating: 4.8, totalStudents: 290, avgInterestScore: 8.9 },
    },
    {
      title: 'DAO Governance',
      slug: 'dao-governance',
      thumbnail: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400&q=80',
      price: 44.99,
      originalPrice: 64.99,
      isFree: false,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'Thiết kế & vận hành tổ chức DAO',
      createdAt: new Date('2024-12-20'),
      category: { name: 'DAO', slug: 'dao' },
      overallAnalytics: { avgRating: 4.4, totalStudents: 150, avgInterestScore: 7.8 },
    },

    // ── MOCK_TOP_RATED ─────────────────────────────────────────────────────────
    {
      // slug trùng 'hop-dong-nang-cao' — avgRating 4.98 > 4.9 → sẽ override
      title: 'Hợp đồng nâng cao',
      slug: 'hop-dong-nang-cao',
      thumbnail: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=400&q=80',
      price: 89.0,
      originalPrice: 129.0,
      isFree: false,
      level: CourseLevel.ADVANCED,
      shortDesc: 'Solidity Security & Gas Optimization',
      createdAt: new Date('2024-05-01'),
      category: { name: 'Smart Contract', slug: 'smart-contract' },
      overallAnalytics: { avgRating: 4.98, totalStudents: 1200, avgInterestScore: 9.5 },
    },
    {
      title: 'DeFi Mastery',
      slug: 'defi-mastery',
      thumbnail: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&q=80',
      price: 94.99,
      originalPrice: null,
      isFree: false,
      level: CourseLevel.ADVANCED,
      shortDesc: 'Chiến lược DeFi cho chuyên gia',
      createdAt: new Date('2024-03-01'),
      category: { name: 'DeFi', slug: 'defi' },
      overallAnalytics: { avgRating: 4.95, totalStudents: 3400, avgInterestScore: 9.3 },
    },
    {
      // slug trùng 'ethereum-nang-cao' — avgRating 4.92 > 4.8 → sẽ override
      title: 'Ethereum nâng cao',
      slug: 'ethereum-nang-cao',
      thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
      price: 74.99,
      originalPrice: null,
      isFree: false,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'EVM, Gas & Layer 2 Solutions',
      createdAt: new Date('2024-06-15'),
      category: { name: 'Ethereum', slug: 'ethereum' },
      overallAnalytics: { avgRating: 4.92, totalStudents: 9800, avgInterestScore: 8.9 },
    },
    {
      // slug trùng 'nen-tang-blockchain-2024' — avgRating 4.88 > 4.8 → sẽ override
      title: 'Nền tảng Blockchain 2024',
      slug: 'nen-tang-blockchain-2024',
      thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80',
      price: 49.99,
      originalPrice: 89.99,
      isFree: false,
      level: CourseLevel.BEGINNER,
      shortDesc: 'Học Blockchain từ số 0 đến chuyên gia',
      createdAt: new Date('2024-11-01'),
      category: { name: 'Blockchain', slug: 'blockchain' },
      overallAnalytics: { avgRating: 4.88, totalStudents: 3200, avgInterestScore: 9.2 },
    },
    {
      title: 'Giao dịch Crypto Pro',
      slug: 'giao-dich-crypto-pro',
      thumbnail: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&q=80',
      price: 59.0,
      originalPrice: 89.0,
      isFree: false,
      level: CourseLevel.INTERMEDIATE,
      shortDesc: 'Technical Analysis & Risk Management',
      createdAt: new Date('2024-09-01'),
      category: { name: 'Trading', slug: 'trading' },
      overallAnalytics: { avgRating: 4.85, totalStudents: 4100, avgInterestScore: 8.8 },
    },
  ]

  // Dedup theo slug: nếu trùng, giữ lại course có avgRating cao hơn
  const mockCourseMap = new Map<string, MockCourseInput>()
  for (const course of mockCoursesRaw) {
    const existing = mockCourseMap.get(course.slug)
    const newRating = course.overallAnalytics?.avgRating ?? 0
    const existingRating = existing?.overallAnalytics?.avgRating ?? 0
    if (!existing || newRating > existingRating) {
      mockCourseMap.set(course.slug, course)
    }
  }

  // Tạo/upsert categories từ mock data (không đụng các categories đã tạo trước)
  const mockCategoryIdMap = new Map<string, string>() // categorySlug -> id
  for (const course of mockCourseMap.values()) {
    if (!mockCategoryIdMap.has(course.category.slug)) {
      const cat = await prisma.category.upsert({
        where: { slug: course.category.slug },
        update: {},
        create: { name: course.category.name, slug: course.category.slug },
      })
      mockCategoryIdMap.set(course.category.slug, cat.id)
    }
  }

  // Tạo courses, dùng instructor.id làm creatorId
  for (const course of mockCourseMap.values()) {
    const categoryId = mockCategoryIdMap.get(course.category.slug)!
    await prisma.course.create({
      data: {
        title: course.title,
        slug: course.slug,
        shortDesc: course.shortDesc,
        fullDesc: course.shortDesc,
        level: course.level,
        status: CourseStatus.PUBLISHED,
        price: course.price,
        originalPrice: course.originalPrice,
        isFree: course.isFree,
        thumbnail: course.thumbnail,
        categoryId,
        creatorId: instructor.id,
        createdAt: course.createdAt,
        overallAnalytics: course.overallAnalytics
          ? {
              create: {
                avgRating: course.overallAnalytics.avgRating,
                totalStudents: course.overallAnalytics.totalStudents,
                avgInterestScore: course.overallAnalytics.avgInterestScore,
              },
            }
          : undefined,
      },
    })
  }

  console.log(`--- Seed ${mockCourseMap.size} mock courses thành công! ---`)
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
