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
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { MediaService } from './services/media.service'
import { Response } from 'express'
import 'multer'

@ApiTags('Media')
@Controller('media')
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
  @ApiOperation({ summary: 'Upload ảnh (tối đa 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary', description: 'File ảnh cần upload' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload thành công, trả về URL ảnh',
    schema: { example: { url: '/media/abc123.webp' } },
  })
  @ApiResponse({ status: 400, description: 'Không có file hoặc file không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
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
  @ApiOperation({ summary: 'Upload ảnh avatar (tối đa 5 MB, tự convert sang WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary', description: 'File ảnh avatar' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload avatar thành công, trả về URL',
    schema: { example: { url: '/media/avatar-abc123.webp' } },
  })
  @ApiResponse({ status: 400, description: 'Không có file hoặc file không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
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
  @ApiOperation({ summary: 'Upload thumbnail avatar nhỏ (tối đa 2 MB, tự convert & resize)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary', description: 'File ảnh thumbnail avatar' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload thumbnail avatar thành công',
    schema: { example: { url: '/media/thumb-abc123.webp' } },
  })
  @ApiResponse({ status: 400, description: 'Không có file hoặc file không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
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
  @ApiOperation({ summary: 'Stream / tải ảnh theo tên file (có cache header)' })
  @ApiParam({ name: 'filename', description: 'Tên file ảnh (ví dụ: abc123.webp)' })
  @ApiResponse({ status: 200, description: 'Trả về stream ảnh WebP với cache headers' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
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
