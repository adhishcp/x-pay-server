import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ErrorGenerator } from 'src/utils/error-generator';
import {
  createErrorData,
  createResponseData,
} from 'src/utils/response.builder';
import { USER_ERROR_CODES } from './error-codes';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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
}
