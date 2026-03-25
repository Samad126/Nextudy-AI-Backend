import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { WorkspacesRepository } from './workspaces.repository.js';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(private readonly repo: WorkspacesRepository) {}

  async create(userId: number, createWorkspaceDto: CreateWorkspaceDto) {
    await this.repo.createWorkspace(userId, createWorkspaceDto);
    this.logger.log(`Workspace created by user ${userId}`);
    return {
      message: 'Workspace created successfully',
    };
  }

  async findAll(userId: number) {
    return await this.repo.findAllForUser(userId);
  }

  async update(
    userId: number,
    id: number,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    await this.repo.updateWorkspace(userId, id, updateWorkspaceDto);

    return {
      message: 'Workspace updated successfully',
    };
  }

  async remove(userId: number, id: number) {
    await this.repo.deleteWorkspace(userId, id);
    this.logger.log(`Workspace ${id} deleted by user ${userId}`);
    return {
      message: 'Workspace deleted successfully',
    };
  }

  async getOverview(userId: number, workspaceId: number) {
    const data = await this.repo.getOverview(workspaceId, userId);
    if (!data) throw new NotFoundException('Workspace not found');
    return {
      counts: {
        resources: data._count.resources,
        workbenches: data._count.workbenches,
        quizzes: data._count.quizzes,
        flashcardSets: data._count.flashcardSets,
      },
      recentWorkbenches: data.workbenches,
      recentQuizzes: data.quizzes,
      recentFlashcardSets: data.flashcardSets,
    };
  }
}
