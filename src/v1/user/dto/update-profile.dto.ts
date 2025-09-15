import { IsString, IsEmail, IsOptional, IsDateString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe Updated' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(50, { message: 'Name must be less than 50 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({ example: 'john.updated@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Please provide a valid date' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'MALE', enum: Gender })
  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY' })
  gender?: Gender;
}

export class UploadAvatarDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  avatar: any;
}
