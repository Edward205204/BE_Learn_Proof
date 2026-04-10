import { createZodDto } from 'nestjs-zod'
import { GetUsersQuerySchema, UpdateUserRoleBodySchema, UpdateBanStatusBodySchema } from './admin.model'

export class GetUsersQueryDTO extends createZodDto(GetUsersQuerySchema) {}
export class UpdateUserRoleBodyDTO extends createZodDto(UpdateUserRoleBodySchema) {}
export class UpdateBanStatusBodyDTO extends createZodDto(UpdateBanStatusBodySchema) {}
