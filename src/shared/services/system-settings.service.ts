import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    })
    return setting ? (setting.value as T) : defaultValue
  }

  async setSetting(key: string, value: any) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }

  async getAllSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    })
  }
}
