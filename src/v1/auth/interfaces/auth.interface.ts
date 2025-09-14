import { user } from '@prisma/client';

export interface AuthResult {
  user: Omit<user, 'transactionPin'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface OtpResult {
  success: boolean;
  message: string;
  expiresIn?: number;
  attemptsLeft?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
