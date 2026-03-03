import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { DatabaseModule } from '../../../src/common/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
