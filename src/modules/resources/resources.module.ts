import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { ResourcesController } from './resources.controller.js';
import { ResourceGroupsController } from './resource-groups.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { ResourcesRepository } from './resources.repository.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';

@Module({
  imports: [DatabaseModule, GeminiModule, WorkspacesModule],
  controllers: [ResourcesController, ResourceGroupsController],
  providers: [ResourcesService, ResourcesRepository],
  exports: [ResourcesService],
})
export class ResourcesModule {}
