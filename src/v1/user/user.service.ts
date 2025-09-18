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
import { UpdateUserSettingsDto } from './dto/user-settings.dto';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';

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

  async uploadAvatar(userId: string, avtrUrl: string) {
    try {
      // Update user avatar URL
      const data = await this.prisma.user.update({
        where: { user_id: userId },
        data: { user_avatar: avtrUrl },
      });
      return createResponseData(data);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async getSettings(userId: string) {
    try {
      const settings = await this.prisma.user_settings.findUnique({
        where: {
          user_settings_user_id: userId,
        },
        include: {
          user: {
            select: {
              user_id: true,
              user_name: true,
            },
          },
        },
      });

      if (!settings) {
        throw new ErrorGenerator(USER_ERROR_CODES.USER_NOT_FOUND);
      }

      return createResponseData(settings);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async updateSettings(
    userId: string,
    updateSettingsDto: UpdateUserSettingsDto,
  ) {
    try {
      const settings = await this.prisma.user_settings.upsert({
        where: { user_settings_user_id: userId },
        update: updateSettingsDto,
        create: {
          user_settings_user_id: userId,
          user_settings_biometric_enabled:
            updateSettingsDto.user_settings_biometric_enabled,
          user_settings_push_notifications:
            updateSettingsDto.user_settings_push_notifications,
          user_settings_email_notifications:
            updateSettingsDto.user_settings_email_notifications,
          user_settings_sms_notifications:
            updateSettingsDto.user_settings_sms_notifications,
          user_settings_transaction_alerts:
            updateSettingsDto.user_settings_transaction_alerts,
          user_settings_marketing_consent:
            updateSettingsDto.user_settings_marketing_consent,
          user_settings_data_analytics_consent:
            updateSettingsDto.user_settings_data_analytics_consent,
          user_settings_auto_pay_enabled:
            updateSettingsDto.user_settings_auto_pay_enabled,
        },
      });

      this.logger.log(`Settings updated for user: ${userId}`);

      return createResponseData(settings);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async getPreferences(userId: string) {
    try {
      let preferences = await this.prisma.user_preferences.findUnique({
        where: {
          user_preferences_user_id: userId,
        },
        select: {
          user_preferences_id: true,
          user_preferences_user_id: true,
          user_preferences_currency: true,
          user_preferences_language: true,
          user_preferences_theme: true,
          user_preferences_timezone: true,
          user_preferences_created_at: true,
          user_preferences_updated_at: true,
        },
      });

      // Create default preferences if not exists
      if (!preferences) {
        const newPreferences = await this.prisma.user_preferences.create({
          data: {
            user_preferences_user_id: userId,
            user_preferences_language: 'en',
            user_preferences_currency: 'INR',
            user_preferences_timezone: 'Asia/Kolkata',
            user_preferences_theme: 'light',
          },
        });

        preferences = {
          user_preferences_id: newPreferences.user_preferences_id,
          user_preferences_user_id: newPreferences.user_preferences_user_id,
          user_preferences_currency: newPreferences.user_preferences_currency,
          user_preferences_timezone: newPreferences.user_preferences_timezone,
          user_preferences_language: newPreferences.user_preferences_language,
          user_preferences_created_at:
            newPreferences.user_preferences_created_at,
          user_preferences_theme: newPreferences.user_preferences_theme,
          user_preferences_updated_at:
            newPreferences.user_preferences_created_at,
        };
      }
      return createResponseData(preferences);
    } catch (error) {
      return createErrorData(error);
    }
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdateUserPreferencesDto,
  ) {
    try {
      const preferences = await this.prisma.user_preferences.upsert({
        where: { user_preferences_user_id: userId },
        update: updatePreferencesDto,
        create: {
          user_preferences_user_id: userId,
          user_preferences_language:
            updatePreferencesDto.user_preferences_language ?? 'en',
          user_preferences_currency:
            updatePreferencesDto.user_preferences_currency ?? 'INR',
          user_preferences_timezone:
            updatePreferencesDto.user_preferences_timezone ?? 'Asia/Kolkata',
          user_preferences_theme:
            updatePreferencesDto.user_preferences_theme ?? 'light',
        },
        select: {
          user_preferences_id: true,
          user_preferences_user_id: true,
          user_preferences_language: true,
          user_preferences_currency: true,
          user_preferences_timezone: true,
          user_preferences_theme: true,
          user_preferences_created_at: true,
          user_preferences_updated_at: true,
        },
      });

      return createResponseData(preferences);
    } catch (error) {
      return createErrorData(error);
    }
  }

//   private async getUserStats(userId: string): Promise<UserStats> {
//     const [transactionStats, accountCount, lastTransaction] = await Promise.all(
//       [
//         this.prisma.transaction.aggregate({
//           where: { userId },
//           _count: { id: true },
//           _sum: { amount: true },
//         }),
//         this.prisma.bankAccount.count({
//           where: { userId, isActive: true },
//         }),
//         this.prisma.transaction.findFirst({
//           where: { userId },
//           orderBy: { createdAt: 'desc' },
//           select: { createdAt: true },
//         }),
//       ],
//     );

//     const completedTransactions = await this.prisma.transaction.count({
//       where: {
//         userId,
//         status: 'COMPLETED',
//       },
//     });

//     const totalTransactions = transactionStats._count.id || 0;
//     const successRate =
//       totalTransactions > 0
//         ? (completedTransactions / totalTransactions) * 100
//         : 0;

//     return {
//       totalTransactions,
//       totalAmount: transactionStats._sum.amount?.toString() || '0',
//       successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
//       accountsLinked: accountCount,
//       lastTransaction: lastTransaction?.createdAt,
//     };
//   }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.UPLOAD_PATH);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.UPLOAD_PATH, { recursive: true });
      this.logger.log(`Created upload directory: ${this.UPLOAD_PATH}`);
    }
  }
}
