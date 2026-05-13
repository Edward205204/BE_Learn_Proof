import { Module } from '@nestjs/common'
import { VideoController } from './video.controller'
import { StorageService } from './video.service'

@Module({
  controllers: [VideoController],
  providers: [StorageService],
  exports: [StorageService],
})
export class VideoModule {}
