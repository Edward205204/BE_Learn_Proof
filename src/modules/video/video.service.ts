import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import envConfig from 'src/shared/config'

@Injectable()
export class StorageService {
  private s3Client: S3Client
  private bucketName = envConfig.R2_BUCKET_NAME
  private endpoint = envConfig.ENDPOINT_CLOUD_STORE.replace(/\/+$/, '')

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: envConfig.CLOUD_ACCESS_KEY_ID,
        secretAccessKey: envConfig.CLOUD_SECRET_ACCESS_KEY,
      },
    })
  }

  async uploadVideo(file: Express.Multer.File) {
    const ext = path.extname(file.originalname)
    const key = `lessons/videos/${uuidv4()}${ext}`

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      )
    } catch (error: any) {
      if (error?.Code === 'AccessDenied' || error?.$metadata?.httpStatusCode === 403) {
        throw new ForbiddenException(
          `Cloudflare R2 từ chối upload (403). Kiểm tra lại CLOUD_ACCESS_KEY_ID/CLOUD_SECRET_ACCESS_KEY, quyền ghi bucket "${this.bucketName}" và ACCOUNT_ID.`,
        )
      }
      throw new InternalServerErrorException('Upload video lên Cloudflare R2 thất bại')
    }

    return {
      url: `${this.endpoint}/${key}`,
      key: key,
    }
  }

  async deleteVideo(key: string) {
    return await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    )
  }
}
