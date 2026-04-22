import { z } from 'zod'
import { Role, CourseStatus, CourseLevel } from 'src/generated/prisma/enums'

// 1. Zod schema cho Queries
export const GetUsersQuerySchema = z
  .object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
    role: z.nativeEnum(Role).optional(),
    isBanned: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest', 'name-asc', 'name-desc']).optional(),
  })
  .strict()

export const GetCoursesQuerySchema = z
  .object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
    status: z.nativeEnum(CourseStatus).optional(),
    isBanned: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest', 'price-asc', 'price-desc']).optional(),
  })
  .strict()

// 2. Zod schema cho Body (Mutation)
export const UpdateUserRoleBodySchema = z
  .object({
    role: z.nativeEnum(Role),
  })
  .strict()

export const UpdateBanStatusBodySchema = z
  .object({
    isBanned: z.boolean(),
  })
  .strict()

export const UpdateCourseStatusBodySchema = z
  .object({
    status: z.nativeEnum(CourseStatus),
  })
  .strict()

export const UpdateCourseBanStatusBodySchema = z
  .object({
    isBanned: z.boolean(),
  })
  .strict()

// 3. Zod schema cho Cấu trúc Model (Response Serializing)
export const AdminUserItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  avatar: z.string().nullable(),
  role: z.nativeEnum(Role),
  isBanned: z.boolean(),
  createdAt: z.date(),
  // Stats - có thể join vào
  _count: z.object({
    coursesCreated: z.number().int(),
    enrollments: z.number().int(),
  }),
})

export const AdminGetUsersResponseSchema = z.object({
  items: z.array(AdminUserItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
})

export const AdminUserDetailResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  headline: z.string().nullable(),
  website: z.string().nullable(),
  role: z.nativeEnum(Role),
  isBanned: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const AdminUpdateUserResponseSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(Role),
  isBanned: z.boolean(),
})

export const AdminCourseItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().nullable(),
  status: z.nativeEnum(CourseStatus),
  isBanned: z.boolean(),
  price: z.number(),
  isFree: z.boolean(),
  level: z.nativeEnum(CourseLevel),
  createdAt: z.date(),
  creator: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
  }),
  _count: z.object({
    enrollments: z.number().int(),
    chapters: z.number().int(),
  }),
})

export const AdminGetCoursesResponseSchema = z.object({
  items: z.array(AdminCourseItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
})

export const AdminCourseDetailResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().nullable(),
  shortDesc: z.string(),
  fullDesc: z.string(),
  status: z.nativeEnum(CourseStatus),
  isBanned: z.boolean(),
  price: z.number(),
  isFree: z.boolean(),
  level: z.nativeEnum(CourseLevel),
  createdAt: z.date(),
  updatedAt: z.date(),
  creator: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
  }),
})

export const AdminUpdateCourseResponseSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(CourseStatus),
  isBanned: z.boolean(),
})

export const UpdateSystemSettingSchema = z.object({
  key: z.string(),
  value: z.any(),
})

// Export Type theo Model
export type GetUsersQueryType = z.infer<typeof GetUsersQuerySchema>
export type UpdateUserRoleBodyType = z.infer<typeof UpdateUserRoleBodySchema>
export type UpdateBanStatusBodyType = z.infer<typeof UpdateBanStatusBodySchema>
export type UpdateSystemSettingBodyType = z.infer<typeof UpdateSystemSettingSchema>

export type GetCoursesQueryType = z.infer<typeof GetCoursesQuerySchema>
export type UpdateCourseStatusBodyType = z.infer<typeof UpdateCourseStatusBodySchema>
export type UpdateCourseBanStatusBodyType = z.infer<typeof UpdateCourseBanStatusBodySchema>

export const GetAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
    adminId: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
  })
  .strict()

export const AdminAuditLogItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  details: z.any().nullable(),
  createdAt: z.date(),
  admin: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
  }),
})

export const AdminGetAuditLogsResponseSchema = z.object({
  items: z.array(AdminAuditLogItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
})

export type GetAuditLogsQueryType = z.infer<typeof GetAuditLogsQuerySchema>
