import { PrismaClient } from '../src/generated/prisma/client'
import { LessonType, VideoProviderEnum } from '../src/generated/prisma/enums'

type TemplateLesson = {
  title: string
  type: (typeof LessonType)[keyof typeof LessonType]
  shortDesc?: string
  duration?: number
  videoId?: string
  videoKey?: string
  textContent?: string
  lessonDesc?: string
  learningObjectives?: string[]
  targetLevel?: string
  keywords?: string[]
  aiSummary?: string
  transcript?: string
  transcriptSource?: string
  transcriptStatus?: string
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

  const mobileTemplates: TemplateChapter[] = [
    {
      title: 'Chương 1: Nền tảng Mobile App',
      lessons: [
        {
          title: 'Giới thiệu lộ trình xây dựng ứng dụng mobile chuyên sâu',
          type: LessonType.VIDEO,
          duration: 1080,
          videoId: 'wxxszUSs4Kk',
          shortDesc: 'Tổng quan lộ trình học, công nghệ cần chuẩn bị và cách tiếp cận dự án mobile thực chiến.',
          lessonDesc:
            'Bài học mở đầu giúp học viên hiểu toàn bộ lộ trình của khóa học, cách tư duy khi xây dựng ứng dụng mobile, các công nghệ chính sẽ dùng xuyên suốt và tiêu chí để triển khai một sản phẩm đủ chất lượng đưa vào thực tế.',
          learningObjectives: [
            'Hiểu cấu trúc tổng thể của khóa học Master Mobile App',
            'Nắm được tư duy xây dựng ứng dụng mobile theo hướng sản phẩm',
            'Biết các công cụ, thư viện và quy trình làm việc chính',
            'Xác định được đầu ra thực tế sau khi hoàn thành khóa học',
          ],
          targetLevel: 'BEGINNER',
          keywords: ['mobile app', 'react native', 'flutter', 'app architecture', 'ui ux', 'deployment'],
          aiSummary:
            'Bài video giới thiệu lộ trình học chuyên sâu về mobile app, định hướng từ nền tảng đến thực chiến, nhấn mạnh tư duy kiến trúc, quy trình phát triển và các kỹ năng cần có để hoàn thiện một sản phẩm ứng dụng di động.',
          transcript:
            'Trong bài học này, chúng ta sẽ bắt đầu với bức tranh tổng quan của khóa học Master Mobile App. Học viên sẽ được giới thiệu mục tiêu đầu ra, các mốc kiến thức cần nắm, cách tổ chức dự án, và tiêu chí để đánh giá một ứng dụng mobile sẵn sàng đưa vào thực tế.\n\nTiếp theo, bài học trình bày những công nghệ cốt lõi sẽ được sử dụng xuyên suốt khóa học, bao gồm cách chia lớp giao diện, quản lý trạng thái, kết nối API, xử lý điều hướng và tối ưu trải nghiệm người dùng. Đây là nền tảng quan trọng để tránh việc học rời rạc theo từng tính năng nhỏ.\n\nCuối cùng, bài học hướng dẫn học viên cách học theo dự án, cách đọc tài liệu, cách ghi chú các pattern phổ biến và cách tận dụng phần thực hành để biến kiến thức thành kỹ năng thật. Sau bài này, học viên sẽ có một bản đồ rõ ràng để đi tiếp các chương sau một cách chủ động hơn.',
          transcriptSource: 'youtube',
          transcriptStatus: 'AVAILABLE',
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
  if (categorySlug === 'mobile') {
    return mobileTemplates
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
          shortDesc: lessonData.shortDesc,
          chapterId: chapter.id,
          duration: lessonData.duration,
          videoId: lessonData.videoId,
          provider: lessonData.videoId ? VideoProviderEnum.YOUTUBE : undefined,
          videoKey: lessonData.videoKey,
          textContent: lessonData.textContent,
          lessonDesc: lessonData.lessonDesc,
          learningObjectives: lessonData.learningObjectives ?? [],
          targetLevel: lessonData.targetLevel,
          keywords: lessonData.keywords ?? [],
          aiSummary: lessonData.aiSummary,
          transcript: lessonData.transcript,
          transcriptSource: lessonData.transcriptSource,
          transcriptStatus: lessonData.transcriptStatus,
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

// ─────────────────────────────────────────────────────────────────────────────
// Seed 2 khóa học cụ thể từ seed.txt
// Tác giả: nguyentranminhkhoa1@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
type SeedCourse = {
  title: string
  slug: string
  shortDesc: string
  categorySlug: string
  categoryName: string
  chapters: {
    title: string
    lessons: {
      title: string
      videoId: string
      shortDesc: string
      aiSummary: string
    }[]
  }[]
}

const SEED_COURSES: SeedCourse[] = [
  {
    title: 'Nestjs Crash Course',
    slug: 'nestjs-crash-course',
    shortDesc:
      'Khóa học NestJS từ cơ bản đến nâng cao: kiến trúc Module-Controller-Service, validation, xử lý lỗi và bảo mật API.',
    categorySlug: 'backend',
    categoryName: 'Backend Development',
    chapters: [
      {
        title: 'Chương 1: Tổng Quan Kiến Trúc & Khởi Tạo Dự Án',
        lessons: [
          {
            title: 'Introduction & Setup',
            videoId: 'pcX97ZrTE6M',
            shortDesc:
              'Giới thiệu về NestJS, cài đặt CLI và khởi tạo dự án Ninja API để làm quen với kiến trúc Module-Controller-Service.',
            aiSummary:
              'Video giới thiệu NestJS - framework TypeScript cho Node.js cung cấp kiến trúc chuẩn hóa. Hướng dẫn cài đặt CLI, khởi tạo dự án, khám phá luồng dữ liệu qua Module-Controller-Service và kiểm thử API bằng Thunder Client.',
          },
          {
            title: 'Modules',
            videoId: 'qZfO4EopfPA',
            shortDesc:
              'Tìm hiểu Module trong NestJS - cách nhóm các thành phần liên quan và sử dụng Nest CLI để tạo file tự động.',
            aiSummary:
              'Module là đơn vị tổ chức ứng dụng Nest.js, có cấu trúc cây bắt đầu từ AppModule. Hướng dẫn dùng CLI tạo module, controller, service và resource nhanh. Khuyến cáo nắm vững cơ bản trước khi dùng lệnh tạo resource tự động.',
          },
        ],
      },
      {
        title: 'Chương 2: Xây Dựng Core API Với Controllers & Providers',
        lessons: [
          {
            title: 'Controllers',
            videoId: 'QTA8emDmH-s',
            shortDesc:
              'Thiết lập và sử dụng Controllers để quản lý routes trong API với các decorator @Get, @Post, @Param, @Body.',
            aiSummary:
              'Controller đóng vai trò bộ định tuyến, định nghĩa path và phương thức HTTP. Giới thiệu decorators @Controller, @Get, @Post, @Put, @Delete. Trích xuất dữ liệu qua @Param, @Query, @Body. Tầm quan trọng của DTO để typing dữ liệu đầu vào.',
          },
          {
            title: 'Providers',
            videoId: 'MPYNkau4Bgg',
            shortDesc:
              'Khái niệm Providers (Injectable Services) trong NestJS, tách biệt logic xử lý khỏi Controller qua Dependency Injection.',
            aiSummary:
              'Provider dùng @Injectable() để Nest.js tự quản lý vòng đời và tiêm (inject) vào class khác. Hướng dẫn xây dựng CRUD logic: lấy danh sách, tìm theo ID, tạo mới, cập nhật, xóa. Nhấn mạnh không khởi tạo class thủ công mà để framework xử lý.',
          },
        ],
      },
      {
        title: 'Chương 3: Nâng Cao – Validation, Xử Lý Lỗi & Bảo Mật API',
        lessons: [
          {
            title: 'Exception Handling',
            videoId: 'LIqItrgFLrw',
            shortDesc:
              'Xử lý ngoại lệ trong NestJS: sử dụng NotFoundException, HttpException thay vì lỗi 500 mặc định.',
            aiSummary:
              'Mặc định Nest.js trả 500 khi có lỗi. Dùng NotFoundException (404), UnauthorizedException (401)... để trả về mã phù hợp. Triển khai try-catch và throw exception. Có thể tạo exception tùy chỉnh hoặc dùng Exception Filters để tự động hóa.',
          },
          {
            title: 'Pipes',
            videoId: 'dxPZzkXX9GE',
            shortDesc:
              'Sử dụng Pipes trong NestJS để biến đổi (transformation) và xác thực (validation) dữ liệu trước khi vào controller.',
            aiSummary:
              'Pipes có 2 mục đích: transformation (ParseIntPipe chuyển chuỗi sang số) và validation (class-validator + class-transformer). Dùng ValidationPipe kích hoạt kiểm tra tự động, trả 400 Bad Request khi dữ liệu không hợp lệ.',
          },
          {
            title: 'Guards in Nestjs',
            videoId: 'shw2sctnDe8',
            shortDesc: 'Guards bảo vệ routes dựa trên logic xác thực và phân quyền, triển khai interface CanActivate.',
            aiSummary:
              'Guards bảo vệ route qua authentication/authorization. Tạo bằng nest g guard, triển khai CanActivate trả true/false. Dùng @UseGuards() áp dụng cho controller hoặc method cụ thể. canActivate nhận ExecutionContext để phân tích request và đưa ra quyết định.',
          },
        ],
      },
    ],
  },
  {
    title: 'Complete React Native Tutorial',
    slug: 'complete-react-native-tutorial',
    shortDesc:
      'Khóa học React Native toàn diện: từ thiết lập Expo, điều hướng file-based, UI theming đến tích hợp backend Appwrite.',
    categorySlug: 'mobile',
    categoryName: 'Mobile App',
    chapters: [
      {
        title: 'Chương 1: Môi Trường & Thành Phần Gốc',
        lessons: [
          {
            title: 'Introduction & Setup (Expo)',
            videoId: 'J2j1yk-34OY',
            shortDesc:
              'Giới thiệu React Native và thiết lập môi trường phát triển ứng dụng di động với Expo từ con số 0.',
            aiSummary:
              'Giới thiệu React Native cho phép xây dựng app iOS/Android/Web từ một codebase. Tạo dự án Expo với template blank, dùng Expo Go để xem trước. Cấu hình Expo Router cho file-based routing, giới thiệu Appwrite làm backend BaaS.',
          },
          {
            title: 'Text, View & Image Components',
            videoId: 'UCbRTaX6i7g',
            shortDesc:
              'Các thành phần cơ bản Text, View, Image trong React Native và cách tạo kiểu với StyleSheet và Flexbox.',
            aiSummary:
              'Ba component cốt lõi: Text (hiển thị văn bản), View (tương tự div HTML), Image (dùng prop source). Tạo kiểu bằng StyleSheet API, inline style, kết hợp nhiều style bằng mảng. Flexbox mặc định theo hướng column với alignItems và justifyContent.',
          },
        ],
      },
      {
        title: 'Chương 2: Kiến Trúc Điều Hướng',
        lessons: [
          {
            title: 'File-Base Navigation',
            videoId: 'e1oMTqZ73aU',
            shortDesc:
              'Xây dựng hệ thống điều hướng dựa trên tập tin với Expo Router, sử dụng component Link để điều hướng giữa các trang.',
            aiSummary:
              'Expo Router ánh xạ file trong thư mục app thành route tương ứng. Dùng component Link (href) để điều hướng. Tạo thêm trang contact, cập nhật liên kết. Giới thiệu giải pháp phức tạp hơn ở bài tiếp theo.',
          },
          {
            title: 'Layouts and Stack',
            videoId: 'Fo95XFCHEcg',
            shortDesc:
              'Tạo Layout với _layout.jsx và Stack Navigation cung cấp header và nút back tự động trong Expo Router.',
            aiSummary:
              'Tạo _layout.jsx với Slot chỉ định vị trí nội dung trang. Thay bằng Stack để có header và back button tự động. Tùy chỉnh từng màn hình qua Stack.Screen (title, headerShown). Dùng screenOptions áp dụng headerStyle, headerTintColor cho toàn Stack.',
          },
        ],
      },
      {
        title: 'Chương 3: Xử Lý Giao Diện & Theme',
        lessons: [
          {
            title: 'Light and Dark Themes',
            videoId: '42JKBeRTTpk',
            shortDesc:
              'Triển khai chủ đề sáng/tối trong React Native sử dụng hook useColorScheme và bảng màu tập trung.',
            aiSummary:
              'Dùng app.json/userInterfaceStyle để giả lập chế độ. Hook useColorScheme lấy giá trị light/dark/null. Tạo colors.js lưu bảng màu tập trung. Áp dụng màu theo colorScheme cho header và trang. StatusBar với value="auto" tự động điều chỉnh màu.',
          },
          {
            title: 'Themed UI Components',
            videoId: 'Q76Pj9xHBmg',
            shortDesc:
              'Tạo các thành phần UI tái sử dụng ThemedView, ThemedCard, ThemedText tự động đồng bộ với light/dark theme.',
            aiSummary:
              'Xây dựng ThemedView (màu nền tự động), ThemedCard (bo góc, padding), ThemedLogo (tự chuyển ảnh theo theme), Spacer (kiểm soát khoảng cách), ThemedText (màu theo kiểu chữ). Áp dụng vào index, about, contact để giao diện tự thích ứng.',
          },
          {
            title: 'Route Groups & Nested Layouts',
            videoId: 'fhVyd2ERzQ0',
            shortDesc:
              'Tổ chức cấu trúc thư mục với Route Groups (dấu ngoặc đơn) và Nested Layouts cho khu vực xác thực.',
            aiSummary:
              'Route Groups dùng dấu ngoặc (auth) để nhóm trang mà không thay đổi URL. Xây dựng trang Login & Register với components có sẵn. Nested Layout tạo _layout.jsx riêng cho nhóm, ẩn header cha bằng Stack.Screen headerShown: false.',
          },
          {
            title: 'Pressable Component',
            videoId: 'kkDxTG5szSg',
            shortDesc:
              'Sử dụng Pressable để tạo nút bấm tương tác với hiệu ứng opacity khi nhấn, xây dựng ThemedButton tái sử dụng.',
            aiSummary:
              'Pressable thay cho nút thông thường, tạo UX tốt hơn. Hiệu ứng opacity khi nhấn qua prop style + trạng thái pressed. onPress gọi handleSubmit. Tách thành ThemedButton.jsx tái sử dụng, áp dụng vào trang Login và Register.',
          },
        ],
      },
      {
        title: 'Chương 4: Thiết Kế Tab Navigation & Giao Diện Form',
        lessons: [
          {
            title: 'Tabs Navigation',
            videoId: 'zEbaeod2QjM',
            shortDesc: 'Thiết lập Tab Navigation với Expo Router, tùy chỉnh màu sắc tab theo theme sáng/tối.',
            aiSummary:
              'Tạo thư mục (dashboard) quản lý trang sau đăng nhập. Dùng component Tabs thay Stack, ẩn header với headerShown: false. Tùy chỉnh màu tab active/inactive theo theme. Cấu hình từng tab với Tabs.Screen.',
          },
          {
            title: 'Tab Bar Icons',
            videoId: '7hMvA0ZZcbQ',
            shortDesc: 'Thêm và tùy chỉnh biểu tượng cho tab bar sử dụng Ionicons từ @expo/vector-icons.',
            aiSummary:
              'Cài @expo/vector-icons, dùng Ionicons. Thêm biểu tượng qua tabBarIcon trong options. Dùng tham số focused để chuyển icon đầy đủ/outline khi chọn/bỏ chọn. Áp dụng màu linh hoạt theo focused và theme. Hoàn thiện cho Profile, Books, Create.',
          },
          {
            title: 'Safe Area View',
            videoId: '1lKeZqxywEo',
            shortDesc:
              'Xử lý Safe Area trong React Native để nội dung không bị che khuất bởi tai thỏ và thanh trạng thái.',
            aiSummary:
              'Vấn đề: nội dung đè lên UI thiết bị. SafeAreaView tạo padding tự động nhưng gây lag khi dùng Expo Router. Giải pháp tốt hơn: hook useSafeAreaInsets lấy giá trị insets áp dụng thủ công. Tích hợp prop safe vào ThemedView để bật/tắt linh hoạt.',
          },
          {
            title: 'Backend Setup with Appwrite',
            videoId: 'eMbtOh17RuQ',
            shortDesc: 'Kết nối ứng dụng React Native với Appwrite (BaaS) để quản lý xác thực và cơ sở dữ liệu.',
            aiSummary:
              'Giới thiệu Appwrite tiết kiệm thời gian cấu hình server thủ công. Tạo dự án trên Appwrite Console, đăng ký nền tảng React Native. Cài react-native-appwrite và react-native-url-polyfill. Tạo lib/appwrite.js khởi tạo Client, Account, Avatars.',
          },
          {
            title: 'Login & Signup Forms',
            videoId: 'Dg1QV6_sgXo',
            shortDesc: 'Xây dựng form đăng nhập và đăng ký với ThemedTextInput, quản lý state và xử lý UX bàn phím.',
            aiSummary:
              'Tạo ThemedTextInput tự thích ứng light/dark. useState theo dõi email/password, secureTextEntry ẩn mật khẩu. handleSubmit xuất dữ liệu ra console. TouchableWithoutFeedback + Keyboard.dismiss() ẩn bàn phím khi chạm ngoài.',
          },
        ],
      },
      {
        title: 'Chương 5: Logic Xác Thực Toàn Cục',
        lessons: [
          {
            title: 'Appwrite Auth Service',
            videoId: 'Fst8F4hFvjA',
            shortDesc: 'Viết lớp Auth Service tập trung xử lý logic đăng ký và đăng nhập qua Appwrite API.',
            aiSummary:
              'Tạo file dịch vụ riêng trong lib/appwrite.js cô lập logic xác thực. Hàm Create Account dùng account.create() với email, password, username, ID.unique(). Hàm Create Session dùng account.createEmailPasswordSession(). Bọc try/catch xử lý lỗi và throw về UI.',
          },
          {
            title: 'Connecting Forms to Appwrite',
            videoId: 'R_bO2OEvP84',
            shortDesc: 'Kết nối biểu mẫu UI với Appwrite Auth Service để thực hiện đăng ký và đăng nhập thực tế.',
            aiSummary:
              'Cập nhật handleSubmit gọi hàm tạo tài khoản Appwrite. State isSubmitting disable nút tránh request trùng lặp. Alert.alert() thông báo lỗi khi thông tin sai. Khi thành công dùng router.replace("/(dashboard)/books") điều hướng vào trang chính.',
          },
          {
            title: 'Auth Context & Global State',
            videoId: 'b4O4a3qP_tQ',
            shortDesc: 'Quản lý trạng thái đăng nhập toàn cục bằng React Context API với GlobalProvider.',
            aiSummary:
              'Tạo GlobalProvider.js với state toàn cục: isLoggedIn, user, isLoading. useEffect gọi account.get() kiểm tra session còn tồn tại không. Bọc app trong GlobalProvider tại root layout. Các màn hình dùng useGlobalContext() lấy thông tin user mà không gọi lại API.',
          },
        ],
      },
      {
        title: 'Chương 6: Quản Lý Cơ Sở Dữ Liệu & Đăng Xuất',
        lessons: [
          {
            title: 'Appwrite Databases & Collections',
            videoId: 'lT2qR7vI3bU',
            shortDesc:
              'Thiết lập Database và Collection trên Appwrite Console, định nghĩa thuộc tính và phân quyền truy cập.',
            aiSummary:
              'Tạo Database mới trên Appwrite Console lấy ID cần thiết. Tạo Collection "books" lưu danh sách dữ liệu. Định nghĩa thuộc tính: title, thumbnail, userId (liên kết user). Cấu hình Permission ở mức Document cho nhóm Users quyền đọc và ghi.',
          },
          {
            title: 'Fetching Documents',
            videoId: 'gX3O_H5P9Qk',
            shortDesc:
              'Viết hàm gọi API lấy danh sách từ Appwrite Database và Custom Hook useAppwrite để tái sử dụng logic.',
            aiSummary:
              'Khởi tạo instance Databases trong appwrite.js. Viết hàm getAllBooks qua databases.listDocuments(). Tạo custom hook useAppwrite đóng gói logic gọi hàm, quản lý state loading, trả mảng dữ liệu. Gọi hook tại Dashboard, truyền vào FlatList để render.',
          },
          {
            title: 'Appwrite Logout & Wrap Up',
            videoId: 'D-Z5gS9XlIk',
            shortDesc:
              'Triển khai tính năng đăng xuất xóa session và tổng kết toàn bộ series React Native với Expo và Appwrite.',
            aiSummary:
              'Thêm signOut vào Service dùng account.deleteSession("current"). Kết nối nút Đăng xuất ở Profile với signOut, đặt lại user=null và isLoggedIn=false trong Context. Expo Router tự động dùng router.replace("/sign-in") bảo vệ dashboard. Tổng kết: Expo, file-based routing, Safe Area, Themed UI, Appwrite Auth & Database.',
          },
        ],
      },
    ],
  },
]

export async function createSpecificCoursesFromSeed(prisma: PrismaClient, creatorId: string): Promise<string[]> {
  const courseIds: string[] = []
  for (const courseData of SEED_COURSES) {
    // Upsert category
    const category = await prisma.category.upsert({
      where: { slug: courseData.categorySlug },
      update: {},
      create: { name: courseData.categoryName, slug: courseData.categorySlug },
    })

    // Upsert course
    const existing = await prisma.course.findUnique({ where: { slug: courseData.slug } })
    if (existing) {
      console.log(`  Khóa học "${courseData.title}" đã tồn tại, bỏ qua.`)
      courseIds.push(existing.id)
      continue
    }

    const course = await prisma.course.create({
      data: {
        title: courseData.title,
        slug: courseData.slug,
        shortDesc: courseData.shortDesc,
        categoryId: category.id,
        creatorId,
        status: 'PUBLISHED',
        isFree: true,
        price: 0,
        level: 'BEGINNER',
        thumbnail: `https://picsum.photos/seed/${courseData.slug}/800/450`,
      },
    })

    let chapterOrder = 1
    for (const chapterData of courseData.chapters) {
      const chapter = await prisma.chapter.create({
        data: {
          title: chapterData.title,
          order: chapterOrder++,
          courseId: course.id,
        },
      })

      let lessonOrder = 1
      for (const lessonData of chapterData.lessons) {
        const lesson = await prisma.lesson.create({
          data: {
            title: lessonData.title,
            type: LessonType.VIDEO,
            order: lessonOrder++,
            chapterId: chapter.id,
            videoId: lessonData.videoId,
            provider: VideoProviderEnum.YOUTUBE,
            shortDesc: lessonData.shortDesc,
            aiSummary: lessonData.aiSummary,
            transcriptSource: 'youtube',
            transcriptStatus: 'AVAILABLE',
          },
        })

        // Tạo 5 bài quiz cho mỗi lesson
        const quiz = await prisma.quiz.create({
          data: { lessonId: lesson.id },
        })

        const quizQuestions = [
          {
            q: `Nội dung chính được đề cập trong bài "${lessonData.title}" là gì?`,
            ans: ['Tổng quan kiến thức cốt lõi', 'Chi tiết kỹ thuật', 'Lịch sử phát triển', 'Các lỗi thường gặp'],
            correct: 0,
          },
          {
            q: `Bước đầu tiên khi thực hành theo nội dung bài học là gì?`,
            ans: ['Khởi tạo và thiết lập môi trường', 'Chạy ứng dụng ngay', 'Đọc toàn bộ mã nguồn', 'Bỏ qua bước này'],
            correct: 0,
          },
          {
            q: `Điều quan trọng nhất cần nhớ sau khi hoàn thành bài này?`,
            ans: [
              'Các phương pháp thực hành đúng chuẩn',
              'Ghi nhớ tất cả mã nguồn',
              'Không cần thực hành thêm',
              'Học thuộc lòng lý thuyết',
            ],
            correct: 0,
          },
          {
            q: `Công cụ hoặc phương pháp nào thường được áp dụng kèm theo?`,
            ans: ['Kiểm thử và gỡ lỗi', 'Thiết kế đồ họa', 'Quản lý tài chính', 'Chỉnh sửa video'],
            correct: 0,
          },
          {
            q: `Mục tiêu tiếp theo sau khi nắm vững kiến thức này là gì?`,
            ans: ['Áp dụng vào dự án thực tế', 'Dừng lại ở lý thuyết', 'Chờ phiên bản mới', 'Quên đi để học cái khác'],
            correct: 0,
          },
        ]

        for (const q of quizQuestions) {
          const question = await prisma.question.create({
            data: {
              content: q.q,
              quizId: quiz.id,
            },
          })

          await prisma.answer.createMany({
            data: q.ans.map((a, i) => ({
              content: a,
              isCorrect: i === q.correct,
              questionId: question.id,
            })),
          })
        }
      }
    }

    console.log(`  ✓ Đã tạo khóa học: "${courseData.title}" (${courseData.chapters.length} chương)`)
    courseIds.push(course.id)
  }

  return courseIds
}
