import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { DatabaseService } from '../../common/database/database.service.js';

@Injectable()
export class WorkspacesService {
  constructor(private db: DatabaseService) {}

  async create(userId: number, createWorkspaceDto: CreateWorkspaceDto) {
    await this.db.workspace.create({
      data: { ...createWorkspaceDto, ownerId: userId },
    });

    return {
      message: 'Workspace created successfully',
    };
  }

  async findAll(userId: number) {
    return await this.db.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      omit: { ownerId: true },
    });
  }

  async update(
    userId: number,
    id: number,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    await this.db.workspace.update({
      where: { id, ownerId: userId },
      data: updateWorkspaceDto,
    });

    return {
      message: 'Workspace updated successfully',
    };
  }

  async remove(id: number) {
    await this.db.workspace.delete({ where: { id } });

    return {
      message: 'Workspace deleted successfully',
    };
  }

  async join(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === userId) {
      return { message: 'You already own this workspace' };
    }

    await this.db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: {},
      create: { workspaceId, userId },
    });

    return { message: 'Joined workspace successfully' };
  }
}
