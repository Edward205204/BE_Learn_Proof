import { Injectable } from '@nestjs/common'
import { SystemSettingsService } from 'src/shared/services/system-settings.service'
import { UpdateSystemSettingBodyType } from '../admin.model'
import { TransactionHost } from '@nestjs-cls/transactional'
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaClient>>,
  ) {}

  async getAllSettings() {
    return this.systemSettingsService.getAllSettings()
  }

  async updateSetting(body: UpdateSystemSettingBodyType, adminId: string) {
    const { key, value } = body
    const oldSetting = await this.txHost.tx.systemSetting.findUnique({ where: { key } })

    const result = await this.systemSettingsService.setSetting(key, value)

    // Ghi vết audit log
    await this.txHost.tx.auditLog.create({
      data: {
        adminId,
        action: 'UPDATE_SYSTEM_SETTING',
        entity: 'SYSTEM_SETTING',
        entityId: key,
        details: {
          from: oldSetting?.value,
          to: value,
        },
      },
    })

    return result
  }
}
