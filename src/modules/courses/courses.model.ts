import { z } from 'zod'

export const GetCoursesQuery = z
  .object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(12),
    category: z.string().optional(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
    price: z.enum(['true', 'false']).optional(),
    rating: z.coerce.number().optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'popular', 'rating', 'price-asc', 'price-desc']).optional(),
  })
  .strict()

export const GetCourseDetailQuery = z
  .object({
    slug: z.string(),
  })
  .strict()

export const QueryCourseDetailById = z
  .object({
    id: z.string(),
  })
  .strict()

export const CourseItemResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().nullable(),
  price: z.number(),
  originalPrice: z.number().nullable(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  shortDesc: z.string(),
  createdAt: z.date(),
  // Quan hệ kèm theo
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  creator: z.object({
    fullName: z.string(),
    avatar: z.string().nullable(),
  }),
  overallAnalytics: z
    .object({
      avgRating: z.number(),
      totalStudents: z.number(),
    })
    .nullable(),
})

export const GetCoursesResponseSchema = z.object({
  items: z.array(CourseItemResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
})

/** Một bài học trong đề cương — KHÔNG chứa videoUrl / textContent */
export const CurriculumLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  type: z.enum(['VIDEO', 'TEXT', 'QUIZ']),
  duration: z.number().nullable(), // giây
})

export const CurriculumChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  lessons: z.array(CurriculumLessonSchema),
})

export const CourseReviewSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.date(),
  user: z.object({
    fullName: z.string(),
    avatar: z.string().nullable(),
  }),
})

export const CourseDetailResponseSchema = z.object({
  // --- Core ---
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  shortDesc: z.string(),
  fullDesc: z.string(),
  thumbnail: z.string().nullable(),

  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFree: z.boolean(),
  price: z.number(),
  originalPrice: z.number().nullable(),
  isCompleted: z.boolean(),
  publishedLessonsCount: z.number().int(),
  totalPlannedLessons: z.number().int().nullable(),
  expectedDays: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // --- Relations ---
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  creator: z.object({
    id: z.string(),
    fullName: z.string(),
    avatar: z.string().nullable(),
  }),
  chapters: z.array(CurriculumChapterSchema),
  overallAnalytics: z
    .object({
      totalStudents: z.number().int(),
      avgRating: z.number(),
      completionRate: z.number(),
    })
    .nullable(),
  reviews: z.array(CourseReviewSchema),
})

/** Card nhỏ dùng chung cho tất cả các section trên trang chủ */
export const HomeCourseCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().nullable(),
  price: z.number(),
  originalPrice: z.number().nullable(),
  isFree: z.boolean(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  shortDesc: z.string(),
  createdAt: z.date(),
  category: z.object({ name: z.string(), slug: z.string() }),
  creator: z.object({ fullName: z.string(), avatar: z.string().nullable() }),
  overallAnalytics: z
    .object({
      avgRating: z.number(),
      totalStudents: z.number(),
      avgInterestScore: z.number(),
    })
    .nullable(),
})

export const HomeSectionsResponseSchema = z.object({
  trending: z.array(HomeCourseCardSchema), // Top 5 avgInterestScore
  topSelling: z.array(HomeCourseCardSchema), // Top 10 totalStudents
  newest: z.array(HomeCourseCardSchema), // 5 mới nhất
  topRated: z.array(HomeCourseCardSchema), // Top 5 avgRating
})

export const CategoryWithCountSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  _count: z.object({ courses: z.number().int() }),
})

export const GetCategoriesResponseSchema = z.array(CategoryWithCountSchema)

export const GetSearchSuggestionsQuery = z.object({ q: z.string().min(1) }).strict()

export const SearchSuggestionSchema = z.object({
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().nullable(),
})
export const AllSlugsResponseSchema = z.array(z.string())
export const GetSearchSuggestionsResponseSchema = z.array(SearchSuggestionSchema)

// -----
// Crud cho content manager

export const GetCourseParamByIdSchema = z.object({
  id: z.string(),
})
export type GetCourseParamByIdType = z.infer<typeof GetCourseParamByIdSchema>

export const GetMyCoursesManagerQuerySchema = z
  .object({
    status: z.enum(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED']).default('ALL'),
    page: z.coerce.number({ message: 'Tham số page phải là một số' }).int().min(1).default(1),
    limit: z.coerce.number({ message: 'Tham số limit phải là một số' }).int().min(1).default(10),
  })
  .strict()
export type GetMyCoursesManagerQueryType = z.infer<typeof GetMyCoursesManagerQuerySchema>

export const CreateCourseSt1DtoSchema = z
  .object({
    title: z.string().min(1).max(100),
    categoryId: z.string(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    shortDesc: z.string().min(1),
    fullDesc: z.string().min(1),
    thumbnail: z.string().url().nullable().optional(),
    // expectedDays: z.number().int().min(1).optional(),
  })
  .strict()
export type CreateCourseSt1Dto = z.infer<typeof CreateCourseSt1DtoSchema>

export const UpdateCourseBaseInfoDtoSchema = CreateCourseSt1DtoSchema
export type UpdateCourseBaseInfoDto = z.infer<typeof UpdateCourseBaseInfoDtoSchema>

export const CreateCourseSt1ResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  categoryId: z.string(),

  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  shortDesc: z.string(),
  fullDesc: z.string(),
  thumbnail: z.string().nullable(),
  expectedDays: z.number().int().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFree: z.boolean(),
  price: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  category: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
})
export type CreateCourseSt1Response = z.infer<typeof CreateCourseSt1ResponseSchema>

export const ChapterSchema = z.object({
  title: z.string().min(1).max(100),
  order: z.number().int().min(1),
})

export const CreateCourseSt2DtoSchema = z
  .object({
    chapterList: ChapterSchema.array(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const orders = data.chapterList.map((c) => c.order)
    const hasDuplicate = orders.some((val, i) => orders.indexOf(val) !== i)

    if (hasDuplicate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Số thứ tự các chương không được trùng nhau',
        path: ['chapterList'],
      })
    }
  })

export type CreateCourseSt2Dto = z.infer<typeof CreateCourseSt2DtoSchema>

export const CreateCourseFullResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  categoryId: z.string(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  shortDesc: z.string(),
  fullDesc: z.string(),
  thumbnail: z.string().nullable(),
  expectedDays: z.number().int().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFree: z.boolean(),
  price: z.number(),
  originalPrice: z.number().nullable(),
  isCompleted: z.boolean(),
  publishedLessonsCount: z.number().int(),
  totalPlannedLessons: z.number().int().nullable(),
  creatorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  chapters: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      order: z.number().int(),
      courseId: z.string(),
    }),
  ),
})
export type CreateCourseSt2Response = z.infer<typeof CreateCourseFullResponseSchema>

export const CreateCourseSt3DtoSchema = z.object({
  isFree: z.boolean(),
  price: z.number(),
  originalPrice: z.number().nullable(),
})
export type CreateCourseSt3Dto = z.infer<typeof CreateCourseSt3DtoSchema>

export const GetCourseDetailManagerResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  shortDesc: z.string(),
  fullDesc: z.string(),
  thumbnail: z.string().nullable(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFree: z.boolean(),
  price: z.number(),
  originalPrice: z.number().nullable(),
  publishedLessonsCount: z.number().int(),
  totalPlannedLessons: z.number().int().nullable(),
  expectedDays: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  chapters: z.array(CurriculumChapterSchema),
})

// ----

// ----
// Reorder
// DTO cho Lesson
export const ReorderLessonBodySchema = z
  .object({
    courseId: z.string(),
    targetChapterId: z.string(),
    // ID của bài đứng ngay phía TRÊN vị trí mới (null nếu là đầu danh sách)
    prevLessonId: z.string().nullable(),
    // ID của bài đứng ngay phía DƯỚI vị trí mới (null nếu là cuối danh sách)
    nextLessonId: z.string().nullable(),
    lessonId: z.string(),
  })
  .strict()

// DTO cho Chapter
export const ReorderChapterBodySchema = z
  .object({
    courseId: z.string(),
    prevChapterId: z.string().nullable(),
    nextChapterId: z.string().nullable(),
    chapterId: z.string(),
  })
  .strict()

export type ReorderLessonDto = z.infer<typeof ReorderLessonBodySchema>
export type ReorderChapterDto = z.infer<typeof ReorderChapterBodySchema>

// ----
export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>
export type GetSearchSuggestionsQueryType = z.infer<typeof GetSearchSuggestionsQuery>
export type AllSlugsResponse = z.infer<typeof AllSlugsResponseSchema>
export type CategoryWithCount = z.infer<typeof CategoryWithCountSchema>
export type CourseItemResponse = z.infer<typeof CourseItemResponseSchema>
export type GetCoursesResponse = z.infer<typeof GetCoursesResponseSchema>
export type GetCoursesQueryType = z.infer<typeof GetCoursesQuery>
export type HomeSectionsResponse = z.infer<typeof HomeSectionsResponseSchema>
export type CourseDetailResponse = z.infer<typeof CourseDetailResponseSchema>
