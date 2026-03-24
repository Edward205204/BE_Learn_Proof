import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { IStorageService } from '../interfaces/storage.interface';
import sharp = require('sharp');
import { v4 as uuidv4 } from 'uuid';
import { Stream } from 'stream';
import 'multer';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject('IStorageService') private readonly storageService: IStorageService,
  ) {}

  private generateFilename(originalName: string, ext: string = '.webp'): string {
    return `${uuidv4()}${ext}`;
  }

  /**
   * General Image Upload
   * Used for standard images. Optimizes using WebP, strips EXIF data for security and performance.
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      if (!file.mimetype.startsWith('image/')) {
         throw new BadRequestException('File must be an image');
      }
      
      const filename = this.generateFilename(file.originalname);
      this.logger.log(`Processing general image: ${file.originalname}`);

      const optimizedBuffer = await sharp(file.buffer)
        .webp({ quality: 80, effort: 4 }) // Performance: WebP conversion
        .toBuffer();
      
      return await this.storageService.uploadFile(optimizedBuffer, filename, 'image/webp');
    } catch (error) {
       this.logger.error(`Error processing image ${file.originalname}:`, error);
       if (error instanceof BadRequestException) throw error;
       throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Avatar Upload
   * Used for user avatars. Resizes down to 200x200 and compresses.
   */
  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    try {
      if (!file.mimetype.startsWith('image/')) {
         throw new BadRequestException('File must be an image');
      }

      const filename = this.generateFilename(file.originalname);
      this.logger.log(`Processing avatar image: ${file.originalname}`);

      const optimizedBuffer = await sharp(file.buffer)
        .resize(200, 200, {
          fit: sharp.fit.cover,
          position: sharp.strategy.attention // Automatically focuses on faces/interesting parts
        })
        .webp({ quality: 75, effort: 4 }) // Slightly aggressive compression for small avatar
        .toBuffer();

      return await this.storageService.uploadFile(optimizedBuffer, filename, 'image/webp');
    } catch (error) {
      this.logger.error(`Error processing avatar image ${file.originalname}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to process avatar image');
    }
  }

  /**
   * Avatar Thumbnail Upload
   * Even smaller representation of an avatar, e.g., for navbar or tight lists. Size 60x60.
   */
  async uploadAvatarThumbnail(file: Express.Multer.File): Promise<string> {
      try {
      if (!file.mimetype.startsWith('image/')) {
         throw new BadRequestException('File must be an image');
      }

      const filename = this.generateFilename(file.originalname);
      this.logger.log(`Processing avatar thumbnail: ${file.originalname}`);

      const optimizedBuffer = await sharp(file.buffer)
        .resize(60, 60, {
          fit: sharp.fit.cover,
          position: sharp.strategy.attention
        })
        .webp({ quality: 85, effort: 4 }) // Increased quality because image is tiny, artifacts are highly visible
        .toBuffer();

      return await this.storageService.uploadFile(optimizedBuffer, filename, 'image/webp');
    } catch (error) {
      this.logger.error(`Error processing avatar thumbnail ${file.originalname}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to process avatar thumbnail');
    }
  }

  /**
   * Fetch stream for media viewing
   */
  async getFileStream(filename: string): Promise<Stream> {
    return this.storageService.getFileStream(filename);
  }
}
