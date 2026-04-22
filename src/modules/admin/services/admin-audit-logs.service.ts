import { Injectable } from '@nestjs/common'
import { AdminAuditLogsRepo } from '../repos/admin-audit-logs.repo'
import { GetAuditLogsQueryType } from '../admin.model'

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly adminAuditLogsRepo: AdminAuditLogsRepo) {}

  async getAuditLogs(query: GetAuditLogsQueryType) {
    return this.adminAuditLogsRepo.getAuditLogsPaging(query)
  }
}
