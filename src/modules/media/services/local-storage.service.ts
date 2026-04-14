import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { IStorageService } from '../storage.interface'
import * as fs from 'fs'
import * as path from 'path'
import { Stream } from 'stream'

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads')
  private readonly logger = new Logger(LocalStorageService.name)

  private resolveSafePath(filename: string): string {
    // Only allow generated file format: uuid.webp
    if (!/^[a-f0-9-]+\.webp$/i.test(filename)) {
      throw new BadRequestException('Invalid filename')
    }

    const resolvedPath = path.resolve(this.uploadDir, filename)
    const resolvedUploadDir = path.resolve(this.uploadDir)

    if (!resolvedPath.startsWith(`${resolvedUploadDir}${path.sep}`)) {
      throw new BadRequestException('Invalid filename path')
    }

    return resolvedPath
  }

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
      this.logger.log(`Created upload directory at ${this.uploadDir}`)
    }
  }

  async uploadFile(file: Buffer, filename: string, _mimeType: string): Promise<string> {
    const filePath = this.resolveSafePath(filename)
    void _mimeType
    await fs.promises.writeFile(filePath, file)
    return filename
  }

  async getFileStream(filename: string): Promise<Stream> {
    const filePath = this.resolveSafePath(filename)
    try {
      await fs.promises.access(filePath, fs.constants.F_OK)
    } catch {
      throw new NotFoundException('File not found')
    }

    return fs.createReadStream(filePath)
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = this.resolveSafePath(filename)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }
  }
}
