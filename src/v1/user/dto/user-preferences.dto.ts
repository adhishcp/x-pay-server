import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ example: 'en', description: 'Language code (en, hi, ta, etc.)' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'hi', 'ta', 'te', 'kn', 'ml', 'gu', 'mr', 'bn', 'or', 'pa'], {
    message: 'Language must be one of the supported languages'
  })
  language?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @IsIn(['INR', 'USD', 'EUR', 'GBP'], {
    message: 'Currency must be INR, USD, EUR, or GBP'
  })
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @IsIn([
    'Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 
    'Europe/London', 'Asia/Singapore', 'Australia/Sydney'
  ], {
    message: 'Timezone must be one of the supported timezones'
  })
  timezone?: string;

  @ApiPropertyOptional({ example: 'light', enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'], {
    message: 'Theme must be light, dark, or system'
  })
  theme?: string;
}
