import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileUploadService {
  private readonly uploadPath = path.join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {}

  async saveFile(
    file: Express.Multer.File,
    folder = 'default',
    prefix = '',
  ): Promise<{ url: string; fileName: string; size: number }> {
    await fs.mkdir(path.join(this.uploadPath, folder), { recursive: true });

    const fileExtension = path.extname(file.originalname);
    const fileName = `${prefix}${Date.now()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, folder, fileName);

    await fs.writeFile(filePath, file.buffer);

    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    const fileUrl = `${baseUrl}/uploads/${folder}/${fileName}`;

    return {
      url: fileUrl,
      fileName,
      size: file.size,
    };
  }

  async saveFiles(
    files: Express.Multer.File[],
    folder = 'default',
    prefix = '',
  ): Promise<{ url: string; fileName: string; size: number }[]> {
    return Promise.all(files.map((file) => this.saveFile(file, folder, prefix)));
  }
}
