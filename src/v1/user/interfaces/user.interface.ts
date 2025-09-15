import { user, user_preferences, user_settings } from '@prisma/client';

export type UserProfile = Omit<user, 'transactionPin'> & {
  settings?: user_settings;
  preferences?: Omit<user_preferences, 'transactionPin'>;
  stats?: UserStats;
};

export interface UserStats {
  totalTransactions: number;
  totalAmount: string;
  successRate: number;
  accountsLinked: number;
  lastTransaction?: Date;
}

export interface AvatarUploadResult {
  url: string;
  fileName: string;
  size: number;
}
