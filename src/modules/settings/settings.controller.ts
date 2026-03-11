import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('settings')
@ApiBearerAuth('accessToken')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@GetUser('sub') userId: number) {
    return this.settingsService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile (name, email)' })
  updateProfile(@GetUser('sub') userId: number, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(userId, dto);
  }
}
