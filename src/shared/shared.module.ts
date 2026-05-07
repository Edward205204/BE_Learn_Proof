import { Global, Module } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { HashingService } from './services/hashing.service'
import { TokenService } from './services/token.service'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'
import { APIKeyGuard } from 'src/shared/guards/api-key.guard'
import { APP_GUARD } from '@nestjs/core'
import { AuthenticationGuard } from 'src/shared/guards/authentication.guard'
import { MailService } from './services/mail.service'
import { SlugService } from './services/slug.service'
import { SystemSettingsService } from './services/system-settings.service'
import { MaintenanceGuard } from './guards/maintenance.guard'
import { ChunkingService } from './services/chunking.service'
import { VectorStoreService } from './services/vector-store.service'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  MailService,
  SlugService,
  SystemSettingsService,
  ChunkingService,
  VectorStoreService,
]

@Global()
@Module({
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
  exports: sharedServices,
  imports: [JwtModule],
})
export class SharedModule {}
