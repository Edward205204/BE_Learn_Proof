import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Res,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { MediaService } from './services/media.service'
import { Response } from 'express'
import 'multer'

@Controller('media')
@ApiBearerAuth('access-token')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload general image
   * We limit file sizes through Multer interceptor to prevent DoS attacks (Security)
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    const filename = await this.mediaService.uploadImage(file)
    return { url: `/media/${filename}` }
  }

  /**
   * Upload Avatar Size Image
   */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    const filename = await this.mediaService.uploadAvatar(file)
    return { url: `/media/${filename}` }
  }

  /**
   * Upload Avatar Thumbnail
   */
  @Post('avatar-thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
    }),
  )
  async uploadAvatarThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    const filename = await this.mediaService.uploadAvatarThumbnail(file)
    return { url: `/media/${filename}` }
  }

  /**
   * Stream File Endpoint
   * Returns a file stream for frontend usage with proper caching headers (Performance)
   */
  @Get(':filename')
  async streamMedia(@Param('filename') filename: string, @Res({ passthrough: true }) res: Response) {
    const stream = await this.mediaService.getFileStream(filename)

    res.set({
      'Content-Type': 'image/webp', // We process images uniformly into WebP
      // Implemented aggressive caching headers so browsers won't re-download (Performance)
      'Cache-Control': 'public, max-age=31536000, immutable',
    })

    return new StreamableFile(stream as any)
  }
}
