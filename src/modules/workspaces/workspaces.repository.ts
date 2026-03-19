import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly db: DatabaseService) {}

  createWorkspace(userId: number, dto: CreateWorkspaceDto) {
    return this.db.workspace.create({
      data: { ...dto, ownerId: userId },
    });
  }

  findAllForUser(userId: number) {
    return this.db.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      omit: { ownerId: true },
    });
  }

  updateWorkspace(userId: number, id: number, dto: UpdateWorkspaceDto) {
    return this.db.workspace.update({
      where: { id, ownerId: userId },
      data: dto,
    });
  }

  deleteWorkspace(userId: number, id: number) {
    return this.db.workspace.delete({ where: { id, ownerId: userId } });
  }

  findWorkspaceAsMember(workspaceId: number, userId: number) {
    return this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });
  }

  findWorkspaceAsEditor(workspaceId: number, userId: number) {
    return this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
  }

  findWorkspaceAsOwner(workspaceId: number, ownerId: number) {
    return this.db.workspace.findFirst({
      where: { id: workspaceId, ownerId },
    });
  }

  findWorkspaceById(workspaceId: number) {
    return this.db.workspace.findUnique({ where: { id: workspaceId } });
  }
}
