import { IsEmail, IsString, MinLength, IsOptional, IsNotEmpty, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+919876543210', description: 'User phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Please provide a valid Indian phone number (+91XXXXXXXXXX)' })
  @Transform(({ value }) => value?.trim())
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: 'Transaction PIN' })
  @IsString()
  @Length(4, 6, { message: 'PIN must be between 4 and 6 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  pin: string;

  @ApiPropertyOptional({ example: 'device-fingerprint-hash' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

export class RegisterDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Please provide a valid Indian phone number' })
  @Transform(({ value }) => value?.trim())
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: '123456', description: '4-6 digit transaction PIN' })
  @IsString()
  @Length(4, 6, { message: 'PIN must be between 4 and 6 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  pin: string;

  @ApiProperty({ example: 'user@bank', description: 'Virtual Payment Address' })
  @IsString()
  @IsNotEmpty({ message: 'VPA is required' })
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/, { message: 'Please provide a valid VPA format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  vpa: string;
}

export class ResetPinDto {
  @ApiProperty({ example: '123456', description: 'Current PIN' })
  @IsString()
  @Length(4, 6)
  currentPin: string;

  @ApiProperty({ example: '654321', description: 'New PIN' })
  @IsString()
  @Length(4, 6)
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  newPin: string;

  @ApiProperty({ example: '654321', description: 'Confirm new PIN' })
  @IsString()
  @Length(4, 6)
  confirmPin: string;
}
