import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { user } from '@prisma/client';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/response.builder';

@ApiTags('User Profile')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getUserProfile(@GetUser() user: user) {
    const response = await this.userService.userProfile(user.user_id);
    if (response.error) {
      return errorResponseBuilder(response);
    }

    return responseBuilder(response);
  }
}
