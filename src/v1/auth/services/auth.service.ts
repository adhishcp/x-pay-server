import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto, ResetPinDto } from '../dto/auth.dto';
import { SendOtpDto, VerifyOtpDto } from '../dto/otp.dto';
import { AuthResult } from '../interfaces/auth.interface';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { user } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private tokenService: TokenService,
  ) {}

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { phoneNumber, purpose } = sendOtpDto;

    // For registration, check if user already exists
    if (purpose === 'register') {
      const existingUser = await this.prisma.user.findUnique({
        where: { user_phone_number: phoneNumber },
      });

      if (existingUser) {
        throw new ConflictException(
          'User with this phone number already exists',
        );
      }
    }

    // For login and reset_pin, check if user exists
    if (purpose === 'login' || purpose === 'reset_pin') {
      const user = await this.prisma.user.findUnique({
        where: { user_phone_number: phoneNumber },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    return this.otpService.sendOtp(phoneNumber, purpose);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phoneNumber, otp, purpose } = verifyOtpDto;
    return this.otpService.verifyOtp(phoneNumber, otp, purpose);
  }

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const { phoneNumber, email, name, pin, vpa } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { user_phone_number: phoneNumber },
          ...(email ? [{ user_email: email }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.user_phone_number === phoneNumber) {
        throw new ConflictException('Phone number already registered');
      }
      if (existingUser.user_email === email) {
        throw new ConflictException('Email already registered');
      }
    }

    // Check if VPA already exists
    const existingVpa = await this.prisma.virtual_payment_address.findUnique({
      where: { vpa_address: vpa },
    });

    if (existingVpa) {
      throw new ConflictException('VPA already exists');
    }

    // Hash the transaction PIN
    const hashedPin = await bcrypt.hash(pin, this.SALT_ROUNDS);

    // Create user in transaction
    const user = await this.prisma.$transaction(async (prisma) => {
      // Create user
      const newUser = await prisma.user.create({
        data: {
          user_phone_number: phoneNumber,
          user_email: email,
          user_name: name,
          user_status: 'ACTIVE',
          user_kyc_status: 'PENDING',
          user_tier: 'BASIC',
        },
      });

      // Create user preferences with transaction PIN
      await prisma.user_preferences.create({
        data: {
          user_preferences_user_id: newUser.user_id,
          user_preferences_transaction_pin: hashedPin,
        },
      });

      // Create user settings
      await prisma.user_settings.create({
        data: {
          user_settings_user_id: newUser.user_id,
          user_settings_push_notifications: true,
          user_settings_transaction_alerts: true,
        },
      });

      // Create primary wallet
      await prisma.wallet.create({
        data: {
          wallet_user_id: newUser.user_id,
          wallet_type: 'PRIMARY',
          wallet_balance: 0,
        },
      });

      return newUser;
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(user);

    this.logger.log(`New user registered: ${phoneNumber}`);

    return {
      user: {
        ...user,
        transactionPin: undefined, // Never return the PIN
      } as any,
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const { phoneNumber, pin, deviceFingerprint } = loginDto;

    // Find user with preferences (to get transaction PIN)
    const user = await this.prisma.user.findUnique({
      where: { user_phone_number: phoneNumber },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or PIN');
    }

    if (user.user_status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify transaction PIN
    const isValidPin = await bcrypt.compare(
      pin,
      user.preferences?.user_preferences_transaction_pin || '',
    );
    if (!isValidPin) {
      throw new UnauthorizedException('Invalid phone number or PIN');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user,
      deviceFingerprint,
    );

    this.logger.log(`User logged in: ${phoneNumber}`);

    return {
      user: {
        ...user,
        preferences: undefined, // Don't return preferences
      } as any,
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.tokenService.verifyToken(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!,
      ) as JwtRefreshPayload;

      const tokens = await this.tokenService.refreshTokens(
        refreshToken,
        payload,
      );

      return {
        ...tokens,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.tokenService.revokeToken(sessionId);
    this.logger.log(`User logged out: ${userId}`);
  }

  async resetPin(
    userId: string,
    resetPinDto: ResetPinDto,
  ): Promise<{ message: string }> {
    const { currentPin, newPin, confirmPin } = resetPinDto;

    if (newPin !== confirmPin) {
      throw new BadRequestException('New PIN and confirm PIN do not match');
    }

    if (currentPin === newPin) {
      throw new BadRequestException(
        'New PIN must be different from current PIN',
      );
    }

    // Get user preferences
    const userPreferences = await this.prisma.user_preferences.findUnique({
      where: { user_preferences_user_id: userId },
    });

    if (!userPreferences || !userPreferences.user_preferences_transaction_pin) {
      throw new BadRequestException('Transaction PIN not set');
    }

    // Verify current PIN
    const isValidCurrentPin = await bcrypt.compare(
      currentPin,
      userPreferences.user_preferences_transaction_pin,
    );
    if (!isValidCurrentPin) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    // Hash new PIN
    const hashedNewPin = await bcrypt.hash(newPin, this.SALT_ROUNDS);

    // Update PIN
    await this.prisma.user_preferences.update({
      where: { user_preferences_user_id: userId },
      data: { user_preferences_transaction_pin: hashedNewPin },
    });

    // Revoke all existing sessions for security
    await this.tokenService.revokeAllUserTokens(userId);

    this.logger.log(`Transaction PIN reset for user: ${userId}`);

    return {
      message: 'Transaction PIN reset successfully. Please login again.',
    };
  }

  async validateUserSession(
    userId: string,
    sessionId: string,
  ): Promise<user | null> {
    const session = await this.prisma.user_session.findFirst({
      where: {
        user_session_id: sessionId,
        user_session_user_id: userId,
        user_session_is_active: true,
      },
      include: {
        user: true,
      },
    });

    if (!session || !session.user) {
      return null;
    }

    // Update last seen
    await this.prisma.user_session.update({
      where: { user_session_id: sessionId },
      data: { user_session_start_time: new Date() }, // Update last activity
    });

    return session.user;
  }

  async validateRefreshToken(
    refreshToken: string,
    payload: JwtRefreshPayload,
  ): Promise<user | null> {
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

    return session?.user || null;
  }
}
