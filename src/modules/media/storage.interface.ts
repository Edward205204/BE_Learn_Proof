import { Stream } from 'stream';

export interface IStorageService {
  uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string>;
  getFileStream(filename: string): Promise<Stream>;
  deleteFile(filename: string): Promise<void>;
}
