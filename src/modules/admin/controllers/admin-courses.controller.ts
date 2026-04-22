import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { AdminCoursesService } from '../services/admin-courses.service'
import { checkAdmin } from 'src/modules/admin/admin.util'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { GetCoursesQueryDTO, UpdateCourseBanStatusBodyDTO, UpdateCourseStatusBodyDTO } from '../admin.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  AdminCourseDetailResponseSchema,
  AdminGetCoursesResponseSchema,
  AdminUpdateCourseResponseSchema,
} from '../admin.response'

@Controller('admin/courses')
export class AdminCoursesController {
  constructor(private readonly adminCoursesService: AdminCoursesService) {}

  @Get()
  @ZodSerializerDto(AdminGetCoursesResponseSchema)
  async getCourses(@Query() query: GetCoursesQueryDTO, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminCoursesService.getCourses(query as any)
  }

  @Get(':id')
  @ZodSerializerDto(AdminCourseDetailResponseSchema)
  async getCourseDetail(@Param('id') id: string, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminCoursesService.getCourseDetail(id)
  }

  @Patch(':id/status')
  @ZodSerializerDto(AdminUpdateCourseResponseSchema)
  async updateCourseStatus(
    @Param('id') id: string,
    @Body() body: UpdateCourseStatusBodyDTO,
    @ActiveUser() user: TokenPayload,
  ) {
    checkAdmin(user)
    return this.adminCoursesService.updateCourseStatus(id, body, user.userId)
  }

  @Patch(':id/ban')
  @ZodSerializerDto(AdminUpdateCourseResponseSchema)
  async updateCourseBanStatus(
    @Param('id') id: string,
    @Body() body: UpdateCourseBanStatusBodyDTO,
    @ActiveUser() user: TokenPayload,
  ) {
    checkAdmin(user)
    return this.adminCoursesService.updateCourseBanStatus(id, body, user.userId)
  }
}
