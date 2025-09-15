import type { Request as ExpressRequest } from 'express';
import type { user as PrismaUser } from '@prisma/client';

export type Request = ExpressRequest;
export type User = PrismaUser;

// You can also create custom extended types
export type AuthenticatedRequest = ExpressRequest & {
  user: User;
};

export type UserWithoutPassword = Omit<User, 'transactionPin'>;
