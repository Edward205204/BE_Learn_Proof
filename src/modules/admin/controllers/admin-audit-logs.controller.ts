import { Controller, Get, Query } from '@nestjs/common'
import { AdminAuditLogsService } from '../services/admin-audit-logs.service'
import { checkAdmin } from '../admin.util'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'
import { GetAuditLogsQueryDTO } from '../admin.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { AdminGetAuditLogsResponseSchema } from '../admin.response'

@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly adminAuditLogsService: AdminAuditLogsService) {}

  @Get()
  @ZodSerializerDto(AdminGetAuditLogsResponseSchema)
  async getAuditLogs(@Query() query: GetAuditLogsQueryDTO, @ActiveUser() user: TokenPayload) {
    checkAdmin(user)
    return this.adminAuditLogsService.getAuditLogs(query as any)
  }
}
