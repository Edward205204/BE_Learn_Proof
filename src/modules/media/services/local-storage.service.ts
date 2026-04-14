import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { IStorageService } from '../storage.interface'
import * as fs from 'fs'
import * as path from 'path'
import { Stream } from 'stream'

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads')
  private readonly logger = new Logger(LocalStorageService.name)

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
      this.logger.log(`Created upload directory at ${this.uploadDir}`)
    }
  }

  async uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename)
    // NOTE: mimeType could be used here to save to specific folders or store metadata
    await fs.promises.writeFile(filePath, file)
    return filename
  }

  async getFileStream(filename: string): Promise<Stream> {
    const filePath = path.join(this.uploadDir, filename)
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found')
    }
    return fs.createReadStream(filePath)
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }
  }
}
