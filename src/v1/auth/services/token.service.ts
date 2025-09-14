import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  JwtPayload,
  JwtRefreshPayload,
} from '../interfaces/jwt-payload.interface';
import * as crypto from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { user } from '@prisma/client';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generateTokenPair(
    user: user,
    deviceId?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Create or update session
    const session = await this.prisma.user_session.create({
      data: {
        user_session_user_id: user.user_id,
        user_session_device_id:
          deviceId || crypto.randomBytes(16).toString('hex'),
        user_session_session_id: crypto.randomBytes(32).toString('hex'),
        user_session_ip_address: null,
        user_session_user_agent: null,
        user_session_is_active: true,
      },
    });

    const payload: JwtPayload = {
      sub: user.user_id,
      phoneNumber: user.user_phone_number,
      email: user.user_email,
      role: user.user_status, // You can map this to actual roles
      tier: user.user_tier,
      sessionId: session.user_session_id,
      deviceId: session.user_session_device_id,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.user_id,
      sessionId: session.user_session_id,
      tokenVersion: 1, // Can be incremented to invalidate old tokens
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token hash in database
    await this.prisma.user_session.update({
      where: { user_session_id: session.user_session_id },
      data: {
        // Store refresh token hash for security
        // refreshTokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async refreshTokens(
    refreshToken: string,
    payload: JwtRefreshPayload,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Validate session
    const session = await this.prisma.user_session.findFirst({
      where: {
        user_session_id: payload.sessionId,
        user_session_user_id: payload.sub,
        user_session_is_active: true,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new Error('Invalid session');
    }

    // Generate new token pair
    return this.generateTokenPair(session.user, session.user_session_device_id);
  }

  async revokeToken(sessionId: string): Promise<void> {
    await this.prisma.user_session.update({
      where: { user_session_id: sessionId },
      data: {
        user_session_is_active: false,
        user_session_end_time: new Date(),
      },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.user_session.updateMany({
      where: { user_session_user_id: userId, user_session_is_active: true },
      data: {
        user_session_is_active: false,
        user_session_end_time: new Date(),
      },
    });
  }

  verifyToken(token: string, secret: string): any {
    return this.jwtService.verify(token, { secret });
  }
}
