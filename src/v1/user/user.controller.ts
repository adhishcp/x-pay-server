import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { user } from '@prisma/client';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/response.builder';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { SingleFileUpload } from 'src/common/decorators/file-upload.decorator';
import { FileValidationPipe } from 'src/common/pipes/file-validation.pipe';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';

@ApiTags('User Profile')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private userService: UserService,
    private fileUploadService: FileUploadService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get User Profile' })
  async getUserProfile(@GetUser() user: user) {
    const response = await this.userService.userProfile(user.user_id);
    if (response.error) {
      return errorResponseBuilder(response);
    }

    return responseBuilder(response);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update Profile' })
  async updateProfile(
    @GetUser() user: user,
    updateProfileDto: UpdateProfileDto,
  ) {
    const response = await this.userService.updateUserProfile(
      user.user_id,
      updateProfileDto,
    );

    if (response.error) {
      return errorResponseBuilder(response);
    }

    return responseBuilder(response);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get User Settings' })
  async getUserSettings(@GetUser() user: user) {
    const response = await this.userService.getUserSettings(user.user_id);
    if (response.error) {
      return errorResponseBuilder(response);
    }

    return responseBuilder(response);
  }

  @Post('upload-avatar')
  @SingleFileUpload('avatar')
  async uploadAvatar(
    @GetUser() user: user,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
  ) {
    const result = await this.fileUploadService.saveFile(
      file,
      'avatars',
      `${user.user_id}_`,
    );

    const response = await this.userService.uploadAvatar(
      user.user_id,
      result.url,
    );

    if (response.error) {
      return errorResponseBuilder(response);
    }

    return responseBuilder(response);
  }

  @Get('settings')
  @ApiOperation({ summary: 'get user settigns' })
  async getUSerSettings(@GetUser() user: user) {
    const response = await this.userService.getSettings(user.user_id);

    if (response.error) {
      return errorResponseBuilder(response);
    }

    return responseBuilder(response);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update user settings' })
  async updateSettings(
    @GetUser() user: user,
    @Body() updateSettingsDto: UpdateUserSettingsDto,
  ) {
    const updatedSettings = await this.userService.updateSettings(
      user.user_id,
      updateSettingsDto,
    );

    this.logger.log(`Settings updated for user: ${user.user_id}`);
    if (updatedSettings.error) {
      return errorResponseBuilder(updatedSettings);
    }

    return responseBuilder(updatedSettings);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@GetUser() user: user) {
    const preferences = await this.userService.getPreferences(user.user_id);

    if (preferences.error) {
      return errorResponseBuilder(preferences);
    }

    return responseBuilder(preferences);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @GetUser() user: user,
    @Body() updatePreferencesDto: UpdateUserPreferencesDto,
  ) {
    const updatedPreferences = await this.userService.updatePreferences(
      user.user_id,
      updatePreferencesDto,
    );

    this.logger.log(`Preferences updated for user: ${user.user_id}`);

    if (updatedPreferences.error) {
      return errorResponseBuilder(updatedPreferences);
    }

    return responseBuilder(updatedPreferences);
  }
}
