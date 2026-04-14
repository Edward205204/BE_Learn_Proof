import { Module, Global } from '@nestjs/common';
import { IpfsService } from './ipfs.service';

@Global()
@Module({
  providers: [IpfsService],
  exports: [IpfsService],
})
export class IpfsModule {}
