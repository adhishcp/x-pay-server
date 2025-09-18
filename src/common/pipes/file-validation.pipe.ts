import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  private readonly maxSize = 5 * 1024 * 1024; // 5MB

  transform(file: Express.Multer.File | Express.Multer.File[], _metadata: ArgumentMetadata) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Handle single & multiple files
    const files = Array.isArray(file) ? file : [file];

    for (const f of files) {
      if (!this.allowedMimeTypes.includes(f.mimetype)) {
        throw new BadRequestException(
          'Only JPEG, JPG, PNG, and WebP files are allowed',
        );
      }

      if (f.size > this.maxSize) {
        throw new BadRequestException('File size must be less than 5MB');
      }
    }

    return file;
  }
}
