import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { ZodSerializerDto } from 'nestjs-zod'
import { StorageService } from './video.service'
import { UploadVideoResponseSchema } from './video.response'

@Controller('video')
@ApiBearerAuth('access-token')
export class VideoController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    }),
  )
  @ZodSerializerDto(UploadVideoResponseSchema)
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('File must be a video')
    }

    return this.storageService.uploadVideo(file)
  }
}
