import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpStatus,
  HttpCode,
  Req,
  Logger,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto, RegisterDto, ResetPinDto } from './dto/auth.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RefreshTokenDto, LogoutDto } from './dto/refresh-token.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { User } from 'src/common/types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 409,
    description: 'User already exists (for registration)',
  })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    const result = await this.authService.sendOtp(sendOtpDto);
    this.logger.log(
      `OTP sent to ${sendOtpDto.phoneNumber} for ${sendOtpDto.purpose}`,
    );
    return {
      success: true,
      message: 'OTP sent successfully',
      data: result,
    };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(verifyOtpDto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const result = await this.authService.register(registerDto);

    // Update session with request info
    this.logger.log(`User registered successfully: ${registerDto.phoneNumber}`);

    return {
      success: true,
      message: 'User registered successfully',
      data: result,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(loginDto);

    this.logger.log(`User logged in successfully: ${loginDto.phoneNumber}`);

    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refresh(refreshTokenDto.refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@GetUser() user: User, @Req() req: any) {
    const sessionId = req.user.sessionId; // This comes from JWT payload
    await this.authService.logout(user.user_id, sessionId); // Use user.id instead of user.user_id

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('reset-pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset transaction PIN' })
  @ApiResponse({ status: 200, description: 'PIN reset successfully' })
  @ApiResponse({ status: 401, description: 'Current PIN is incorrect' })
  async resetPin(@GetUser() user: User, @Body() resetPinDto: ResetPinDto) {
    const result = await this.authService.resetPin(user.user_id, resetPinDto);

    this.logger.log(`Transaction PIN reset for user: ${user.user_id}`);

    return {
      success: true,
      ...result,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@GetUser() user: User) {
    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        id: user.user_id,
        phoneNumber: user.user_phone_number,
        email: user.user_email,
        name: user.user_name,
        status: user.user_status,
        kycStatus: user.user_kyc_status,
        tier: user.user_tier,
        createdAt: user.user_created_at,
      },
    };
  }
}
