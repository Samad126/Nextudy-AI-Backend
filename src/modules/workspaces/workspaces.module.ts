import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspacesController } from './workspaces.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { ResourcesModule } from '../resources/resources.module.js';
import { WorkspaceAccessGuard } from '../../common/guards/workspace-access.guard.js';

@Module({
  imports: [DatabaseModule, ResourcesModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceAccessGuard],
})
export class WorkspacesModule {}
