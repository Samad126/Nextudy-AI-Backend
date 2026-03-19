import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { WorkspacesController } from './workspaces.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { WorkspacesRepository } from './workspaces.repository.js';
import { WorkspaceMembersService } from './workspace-members.service.js';
import { WorkspaceInvitesService } from './workspace-invites.service.js';
import { WorkspaceMembersRepository } from './workspace-members.repository.js';
import { WorkspaceInvitesRepository } from './workspace-invites.repository.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceInvitesService,
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceInvitesRepository,
  ],
  exports: [
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceInvitesService,
  ],
})
export class WorkspacesModule {}
