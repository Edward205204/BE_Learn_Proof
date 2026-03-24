import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './services/media.service';
import { LocalStorageService } from './services/local-storage.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: 'IStorageService',
      useClass: LocalStorageService,
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
