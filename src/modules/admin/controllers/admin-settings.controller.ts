import { Controller, Get, Patch, Body, ForbiddenException } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { Role } from 'src/generated/prisma/enums'
import { AdminSettingsService } from '../services/admin-settings.service'
import { UpdateSystemSettingBodyDTO } from '../admin.dto'

@ApiTags('Admin Settings')
@Controller('admin/settings')
@ApiBearerAuth('access-token')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  private checkAdmin(user: TokenPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied. Administrator right is required.')
    }
  }

  @Get()
  getSettings(@ActiveUser() user: TokenPayload) {
    this.checkAdmin(user)
    return this.adminSettingsService.getAllSettings()
  }

  @Patch()
  updateSetting(@Body() body: UpdateSystemSettingBodyDTO, @ActiveUser() user: TokenPayload) {
    this.checkAdmin(user)
    return this.adminSettingsService.updateSetting(body, user.userId)
  }
}
