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
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import 'multer'
import { ZodSerializerDto } from 'nestjs-zod'
import { UploadMediaResponseSchema } from './media.response'

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('image')
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  @ZodSerializerDto(UploadMediaResponseSchema)
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    const filename = await this.mediaService.uploadImage(file)
    return { url: `/media/${filename}` }
  }

  @Post('avatar')
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  @ZodSerializerDto(UploadMediaResponseSchema)
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    const filename = await this.mediaService.uploadAvatar(file)
    return { url: `/media/${filename}` }
  }

  @Post('avatar-thumbnail')
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
    }),
  )
  @ZodSerializerDto(UploadMediaResponseSchema)
  async uploadAvatarThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    const filename = await this.mediaService.uploadAvatarThumbnail(file)
    return { url: `/media/${filename}` }
  }

  @Get(':filename')
  @IsPublic()
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
