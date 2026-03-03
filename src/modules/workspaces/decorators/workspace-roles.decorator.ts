import { SetMetadata } from '@nestjs/common';
import type { WorkspaceMemberRole } from '../../../../generated/prisma/client.js';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';

export const WorkspaceRoles = (...roles: WorkspaceMemberRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
