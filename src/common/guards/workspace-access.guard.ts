import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service.js';
import type { WorkspaceMemberRole } from '../../../generated/prisma/client.js';
import { WORKSPACE_ROLES_KEY } from '../../modules/workspaces/guards/workspace-roles.decorator.js';
import { SKIP_WORKSPACE_CHECK_KEY } from '../../modules/workspaces/guards/skip-workspace-check.decorator.js';

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    private db: DatabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & {
        user: { sub: number };
        workspace: object;
        workspaceRole: WorkspaceMemberRole;
      }
    >();

    const workspaceId = +req.params.id;
    if (!workspaceId) return true;

    const skipCheck = this.reflector.get<boolean>(
      SKIP_WORKSPACE_CHECK_KEY,
      context.getHandler(),
    );
    if (skipCheck) return true;

    const userId = req.user.sub;

    const workspace = await this.db.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: { members: { where: { userId }, select: { role: true } } },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    req.workspace = workspace;
    req.workspaceRole =
      workspace.ownerId === userId ? 'owner' : workspace.members[0]?.role;

    const requiredRoles = this.reflector.get<WorkspaceMemberRole[]>(
      WORKSPACE_ROLES_KEY,
      context.getHandler(),
    );

    if (requiredRoles && !requiredRoles.includes(req.workspaceRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
