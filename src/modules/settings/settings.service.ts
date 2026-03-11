import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class SettingsService {
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
    return updated;
  }
}
