import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspacesController } from './workspaces.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { WorkspacesRepository } from './workspaces.repository.js';
import { WorkspaceMembersService } from './workspace-members.service.js';
import { WorkspaceInvitesService } from './workspace-invites.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceInvitesService,
    WorkspacesRepository,
  ],
})
export class WorkspacesModule {}
