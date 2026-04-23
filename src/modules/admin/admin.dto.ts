import { createZodDto } from 'nestjs-zod'
import {
  GetUsersQuerySchema,
  UpdateUserRoleBodySchema,
  UpdateBanStatusBodySchema,
  UpdateCourseStatusBodySchema,
  UpdateCourseBanStatusBodySchema,
  GetAuditLogsQuerySchema,
  UpdateSystemSettingSchema,
  GetCoursesQuerySchema,
} from './admin.model'

export class GetUsersQueryDTO extends createZodDto(GetUsersQuerySchema) {}
export class UpdateUserRoleBodyDTO extends createZodDto(UpdateUserRoleBodySchema) {}
export class UpdateBanStatusBodyDTO extends createZodDto(UpdateBanStatusBodySchema) {}
export class UpdateSystemSettingBodyDTO extends createZodDto(UpdateSystemSettingSchema) {}
export class GetCoursesQueryDTO extends createZodDto(GetCoursesQuerySchema) {}
export class UpdateCourseStatusBodyDTO extends createZodDto(UpdateCourseStatusBodySchema) {}
export class UpdateCourseBanStatusBodyDTO extends createZodDto(UpdateCourseBanStatusBodySchema) {}
export class GetAuditLogsQueryDTO extends createZodDto(GetAuditLogsQuerySchema) {}
