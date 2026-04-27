import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { SystemSettingsService } from '../services/system-settings.service'
import { Role } from 'src/generated/prisma/enums'
import { Reflector } from '@nestjs/core'
import { IS_MAINTENANCE_BYPASS_KEY } from '../decorators/maintenance.decorator'

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra xem route này có được bỏ qua bảo trì không
    const isBypass = this.reflector.getAllAndOverride<boolean>(IS_MAINTENANCE_BYPASS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isBypass) {
      return true
    }

    // Kiểm tra trạng thái bảo trì
    const isMaintenance = await this.systemSettingsService.getSetting('MAINTENANCE_MODE', false)
    if (!isMaintenance) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    // Nếu đã đăng nhập và là ADMIN thì cho phép qua
    if (user?.role === Role.ADMIN) {
      return true
    }

    // Chặn tất cả các trường hợp còn lại
    throw new ForbiddenException('Hệ thống hiện đang trong quá trình bảo trì. Vui lòng quay lại sau.')
  }
}
