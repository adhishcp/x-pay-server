import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ErrorGenerator } from 'src/utils/error-generator';
import {
  createErrorData,
  createResponseData,
} from 'src/utils/response.builder';
import { USER_ERROR_CODES } from './error-codes';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly UPLOAD_PATH = 'uploads/avatars';
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async userProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { user_id: userId },
        include: {
          settings: true,
          preferences: {
            select: {
              user_preferences_id: true,
              user_preferences_currency: true,
              user_preferences_language: true,
              user_preferences_theme: true,
              user_preferences_timezone: true,
            },
          },
          _count: {
            select: {
              bank_accounts: true,
              transactions: true,
              vpas: true,
            },
          },
        },
      });

      if (!user) {
        throw new ErrorGenerator(USER_ERROR_CODES.USER_NOT_FOUND);
      }

      const data = {
        ...user,
        preferences: user.preferences,
        status: user.user_status,
      };
      return createResponseData(data);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async updateUserProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    try {
      const { email, ...otherFields } = updateProfileDto;

      // check if email already taken by another user
      if (email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { user_email: email, NOT: { user_id: userId } },
        });

        if (existingUser) {
          throw new ErrorGenerator(USER_ERROR_CODES.EMAIL_ALREADY_EXISTS);
        }
      }
      // Convert dateOfBirth string to Date object if provided
      const updateData: any = { ...otherFields };
      if (updateProfileDto.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
      }

      if (email) {
        updateData.email = email;
      }
      //   update user
      const updatedUser = await this.prisma.user.update({
        where: { user_id: userId },
        data: updateData,
        include: {
          settings: true,
          preferences: {
            select: {
              user_preferences_id: true,
              user_preferences_currency: true,
              user_preferences_language: true,
              user_preferences_theme: true,
              user_preferences_timezone: true,
              user_preferences_created_at: true,
              user_preferences_updated_at: true,
              user_preferences_user_id: true,
            },
          },
        },
      });
      return createResponseData(updatedUser);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async getUserSettings(userId: string) {
    try {
      const userSettings = await this.prisma.user_settings.findUnique({
        where: { user_settings_user_id: userId },
      });

      // Create default settings if not exists
      const settings = await this.prisma.user_settings.create({
        data: {
          user_settings_user_id: userId,
          user_settings_push_notifications: true,
          user_settings_email_notifications: true,
          user_settings_sms_notifications: true,
          user_settings_transaction_alerts: true,
        },
      });

      return createResponseData(settings);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, JPG, PNG, and WebP files are allowed',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${userId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(this.UPLOAD_PATH, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Generate URL (in production, use CDN URL)
      const baseUrl = this.configService.get(
        'BASE_URL',
        'http://localhost:3000',
      );
      const avatarUrl = `${baseUrl}/uploads/avatars/${fileName}`;

      // Update user avatar URL in database
      await this.prisma.user.update({
        where: { user_id: userId },
        data: { user_avatar: avatarUrl },
      });

      this.logger.log(`Avatar uploaded for user: ${userId}`);

      return {
        url: avatarUrl,
        fileName,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload avatar for user ${userId}:`, error);
      throw new BadRequestException('Failed to upload avatar');
    }
  }
}
