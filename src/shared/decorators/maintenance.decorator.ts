import { SetMetadata } from '@nestjs/common'

export const IS_MAINTENANCE_BYPASS_KEY = 'isMaintenanceBypass'
export const BypassMaintenance = () => SetMetadata(IS_MAINTENANCE_BYPASS_KEY, true)
