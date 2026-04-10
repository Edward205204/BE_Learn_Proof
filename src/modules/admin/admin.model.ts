import { z } from 'zod'
import { Role } from 'src/generated/prisma/enums'

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

// Export Type theo Model
export type GetUsersQueryType = z.infer<typeof GetUsersQuerySchema>
export type UpdateUserRoleBodyType = z.infer<typeof UpdateUserRoleBodySchema>
export type UpdateBanStatusBodyType = z.infer<typeof UpdateBanStatusBodySchema>
