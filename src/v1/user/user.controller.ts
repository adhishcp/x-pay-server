import {
  BadRequestException,
  Controller,
  Get,
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

@ApiTags('User Profile')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

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
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @GetUser() user: user,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.userService.uploadAvatar(user.user_id, file);

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: result,
    };
  }
}
