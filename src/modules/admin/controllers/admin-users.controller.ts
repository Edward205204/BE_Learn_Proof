import { Controller, Get, Param, Patch, Query, Body, ForbiddenException } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { Role } from 'src/generated/prisma/enums'
import { AdminUsersService } from '../services/admin-users.service'
import { checkAdmin } from '../admin.util'
import { GetUsersQueryDTO, UpdateUserRoleBodyDTO, UpdateBanStatusBodyDTO } from '../admin.dto'
import {
  AdminGetUsersResponseSchema,
  AdminUserDetailResponseSchema,
  AdminUpdateUserResponseSchema,
} from '../admin.response'

@ApiTags('Admin Users')
@Controller('admin/users')
@ApiBearerAuth('access-token')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ZodSerializerDto(AdminGetUsersResponseSchema)
  getUsers(@Query() query: GetUsersQueryDTO, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminUsersService.getUsers(query)
  }

  @Get(':id')
  @ZodSerializerDto(AdminUserDetailResponseSchema)
  getUserDetail(@Param('id') id: string, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminUsersService.getUserDetail(id)
  }

  @Patch(':id/role')
  @ZodSerializerDto(AdminUpdateUserResponseSchema)
  updateUserRole(@Param('id') id: string, @Body() body: UpdateUserRoleBodyDTO, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminUsersService.updateUserRole(id, body, user.userId)
  }

  @Patch(':id/ban')
  @ZodSerializerDto(AdminUpdateUserResponseSchema)
  updateBanStatus(@Param('id') id: string, @Body() body: UpdateBanStatusBodyDTO, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminUsersService.updateBanStatus(id, body, user.userId)
  }
}
