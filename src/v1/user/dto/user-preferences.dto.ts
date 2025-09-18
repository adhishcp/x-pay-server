// dto/update-user-preferences.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ example: 'en', description: 'Language code (en, hi, ta, etc.)' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'hi', 'ta', 'te', 'kn', 'ml', 'gu', 'mr', 'bn', 'or', 'pa'], {
    message: 'Language must be one of the supported languages',
  })
  user_preferences_language?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @IsIn(['INR', 'USD', 'EUR', 'GBP'], {
    message: 'Currency must be INR, USD, EUR, or GBP',
  })
  user_preferences_currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @IsIn(
    [
      'Asia/Kolkata',
      'Asia/Dubai',
      'America/New_York',
      'Europe/London',
      'Asia/Singapore',
      'Australia/Sydney',
    ],
    {
      message: 'Timezone must be one of the supported timezones',
    },
  )
  user_preferences_timezone?: string;

  @ApiPropertyOptional({ example: 'light', enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'], {
    message: 'Theme must be light, dark, or system',
  })
  user_preferences_theme?: string;
}
