import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: number) {
    return this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        created_at: true,
      },
    });
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const updated = await this.db.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    this.logger.log(`Profile updated for user ${userId}`);
    return updated;
  }
}
