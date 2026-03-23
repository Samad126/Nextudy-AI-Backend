import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkbenchDto } from './dto/create-workbench.dto.js';
import { UpdateWorkbenchDto } from './dto/update-workbench.dto.js';
import { SetResourcesDto } from './dto/set-resources.dto.js';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import { WorkbenchesRepository } from './workbenches.repository.js';

@Injectable()
export class WorkbenchesService {
  private readonly logger = new Logger(WorkbenchesService.name);

  constructor(
    private readonly repo: WorkbenchesRepository,
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
  ) {}

  async create(userId: number, { name, workspaceId }: CreateWorkbenchDto) {
    const workspace = await this.repo.findWorkspaceAsEditor(
      workspaceId,
      userId,
    );
    if (!workspace) throw new ForbiddenException('Access denied');

    this.logger.log(`Workbench created in workspace ${workspaceId}`);
    return this.repo.create(workspaceId, name);
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.repo.findWorkspaceAsMember(
      workspaceId,
      userId,
    );
    if (!workspace) throw new NotFoundException('Workbenches not found');

    return this.repo.findAll(workspaceId);
  }

  async update(
    userId: number,
    workbenchId: number,
    { name }: UpdateWorkbenchDto,
  ) {
    const workbench = await this.repo.findOneAsEditor(workbenchId, userId);
    if (!workbench) throw new NotFoundException('Workbench not found');

    return this.repo.update(workbenchId, name);
  }

  async remove(userId: number, workbenchId: number) {
    const workbench = await this.repo.findOneAsEditor(workbenchId, userId);
    if (!workbench) throw new NotFoundException('Workbench not found');

    await this.repo.delete(workbenchId);
    this.logger.log(`Workbench ${workbenchId} deleted`);
    return { message: 'Workbench deleted successfully' };
  }

  async getResources(userId: number, workbenchId: number) {
    const workbench = await this.repo.findOneAsMember(workbenchId, userId);
    if (!workbench) throw new NotFoundException('Workbench not found');

    return this.repo.findResources(workbenchId);
  }

  async verifyMemberAccess(userId: number, workbenchId: number) {
    const workbench = await this.repo.findOneAsMember(workbenchId, userId);
    if (!workbench) throw new NotFoundException('Workbench not found');
  }

  async verifyEditorAccess(userId: number, workbenchId: number) {
    const workbench = await this.repo.findOneAsEditor(workbenchId, userId);
    if (!workbench) throw new NotFoundException('Workbench not found');
  }

  async getGeminiFiles(userId: number, workbenchId: number) {
    const resources = await this.getResources(userId, workbenchId);
    return this.gemini.toGeminiFiles(resources.map((wr) => wr.resource));
  }

  async getGeminiFilesWithMeta(userId: number, workbenchId: number) {
    const resources = await this.getResources(userId, workbenchId);
    const files = this.gemini.toGeminiFiles(resources.map((wr) => wr.resource));
    const resourceMeta = resources.map((wr) => ({
      id: wr.resource.id,
      fileName: wr.resource.name,
    }));
    return { files, resourceMeta };
  }

  async setResources(
    userId: number,
    workbenchId: number,
    { resourceIds }: SetResourcesDto,
  ) {
    const workbench = await this.repo.findOneAsEditor(workbenchId, userId);
    if (!workbench) throw new NotFoundException('Workbench not found');

    await this.repo.setResources(workbenchId, resourceIds);
    return this.repo.findResources(workbenchId);
  }
}
