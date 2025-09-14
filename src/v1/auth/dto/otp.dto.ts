import { IsString, IsNotEmpty, Length, Matches, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Please provide a valid Indian phone number' })
  phoneNumber: string;

  @ApiProperty({ example: 'login', enum: ['login', 'register', 'reset_pin'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(["login", "register", "reset_pin"])
  purpose: 'login' | 'register' | 'reset_pin';
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+91[6-9]\d{9}$/)
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiProperty({ example: 'login' })
  @IsString()
  @IsNotEmpty()
  purpose: 'login' | 'register' | 'reset_pin';
}
