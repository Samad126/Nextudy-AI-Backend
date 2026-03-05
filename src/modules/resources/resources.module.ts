import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { ResourcesController } from './resources.controller.js';
import { ResourceGroupsController } from './resource-groups.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ResourcesController, ResourceGroupsController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
