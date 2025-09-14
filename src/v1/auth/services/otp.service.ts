import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 1;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async sendOtp(
    phoneNumber: string,
    purpose: string,
  ): Promise<{
    success: boolean;
    message: string;
    expiresIn: number;
  }> {
    // Check rate limiting
    await this.checkRateLimit(phoneNumber, purpose);

    // Generate OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Store OTP in database
    await this.prisma.otp_verifications.upsert({
      where: {
        otp_phone_number_otp_purpose: {
          otp_phone_number: phoneNumber,
          otp_purpose: purpose,
        },
      },
      update: {
        otp_hash: this.hashOtp(otp),
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        otp_created_at: new Date(),
      },
      create: {
        otp_phone_number: phoneNumber,
        otp_hash: this.hashOtp(otp),
        otp_purpose: purpose,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
      },
    });

    // Send OTP via SMS (implement your SMS service)
    await this.sendSms(phoneNumber, otp);

    this.logger.log(`OTP sent to ${phoneNumber} for ${purpose}`);

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  async verifyOtp(
    phoneNumber: string,
    otp: string,
    purpose: string,
  ): Promise<{
    success: boolean;
    message: string;
    attemptsLeft?: number;
  }> {
    const otpRecord = await this.prisma.otp_verifications.findUnique({
      where: {
        otp_phone_number_otp_purpose: {
          otp_phone_number: phoneNumber,
          otp_purpose: purpose,
        },
      },
    });

    if (!otpRecord || otpRecord.otp_expires_at < new Date()) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (otpRecord.otp_attempts >= this.MAX_ATTEMPTS) {
      throw new BadRequestException('Maximum OTP attempts exceeded');
    }

    // Verify OTP
    const isValidOtp = this.verifyHashedOtp(otp, otpRecord.otp_hash);

    if (!isValidOtp) {
      // Increment attempts
      await this.prisma.otp_verifications.update({
        where: {
          otp_phone_number_otp_purpose: {
            otp_phone_number: phoneNumber,
            otp_purpose: purpose,
          },
        },
        data: {
          otp_attempts: otpRecord.otp_attempts + 1,
        },
      });

      const attemptsLeft = this.MAX_ATTEMPTS - (otpRecord.otp_attempts + 1);

      if (attemptsLeft <= 0) {
        throw new BadRequestException('Maximum OTP attempts exceeded');
      }

      return {
        success: false,
        message: 'Invalid OTP',
        attemptsLeft,
      };
    }

    // Delete used OTP
    await this.prisma.otp_verifications.delete({
      where: {
        otp_phone_number_otp_purpose: {
          otp_phone_number: phoneNumber,
          otp_purpose: purpose,
        },
      },
    });

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  }

  private generateOtp(): string {
    // In production, use a cryptographically secure random generator
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOtp(otp: string): string {
    const salt = this.configService.get('OTP_SALT', 'default-salt');
    return crypto
      .createHash('sha256')
      .update(otp + salt)
      .digest('hex');
  }

  private verifyHashedOtp(otp: string, hashedOtp: string): boolean {
    return this.hashOtp(otp) === hashedOtp;
  }

  private async checkRateLimit(
    phoneNumber: string,
    purpose: string,
  ): Promise<void> {
    const recentOtp = await this.prisma.otp_verifications.findFirst({
      where: {
        otp_phone_number: phoneNumber,
        otp_purpose: purpose,
        otp_created_at: {
          gte: new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000),
        },
      },
    });

    if (recentOtp) {
      throw new BadRequestException(
        `Please wait ${this.RATE_LIMIT_MINUTES} minute(s) before requesting another OTP`,
      );
    }
  }

  private async sendSms(phoneNumber: string, otp: string): Promise<void> {
    // Implement your SMS service integration here
    // For development, just log the OTP
    this.logger.debug(`SMS OTP for ${phoneNumber}: ${otp}`);

    // Example: AWS SNS, Twilio, or Indian SMS providers like MSG91
    // const message = `Your UPI App verification code is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
    // await this.smsProvider.send(phoneNumber, message);
  }
}
