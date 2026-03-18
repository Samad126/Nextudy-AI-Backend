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
import { DatabaseService } from '../../common/database/database.service.js';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class WorkbenchesService {
  private readonly logger = new Logger(WorkbenchesService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
  ) {}

  async create(userId: number, createWorkbenchDto: CreateWorkbenchDto) {
    const { name, workspaceId } = createWorkbenchDto;

    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    this.logger.log(`Workbench created in workspace ${workspaceId}`);
    return this.db.workbench.create({
      data: {
        workspaceId,
        name,
      },
    });
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });

    if (!workspace) throw new NotFoundException('Workbenches not found');

    return this.db.workbench.findMany({
      where: { workspaceId },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} workbench`;
  }

  async update(
    userId: number,
    workbenchId: number,
    updateWorkbenchDto: UpdateWorkbenchDto,
  ) {
    const workbench = await this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: { ...ownerOrEditorFilter(userId) } },
    });

    if (!workbench) throw new NotFoundException('Workbench not found');

    return this.db.workbench.update({
      where: { id: workbenchId },
      data: {
        name: updateWorkbenchDto.name,
      },
    });
  }

  async remove(userId: number, workbenchId: number) {
    const workbench = await this.db.workbench.findFirst({
      where: {
        id: workbenchId,
        workspace: ownerOrEditorFilter(userId),
      },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');

    await this.db.workbench.delete({ where: { id: workbenchId } });
    this.logger.log(`Workbench ${workbenchId} deleted`);
    return { message: 'Workbench deleted successfully' };
  }

  async getResources(userId: number, workbenchId: number) {
    const workbench = await this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: { ...anyMemberFilter(userId) } },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');

    return this.db.workbenchResource.findMany({
      where: { workbenchId },
      include: { resource: true },
    });
  }

  async verifyMemberAccess(userId: number, workbenchId: number) {
    const workbench = await this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: { ...anyMemberFilter(userId) } },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');
  }

  async verifyEditorAccess(userId: number, workbenchId: number) {
    const workbench = await this.db.workbench.findFirst({
      where: {
        id: workbenchId,
        workspace: { ...ownerOrEditorFilter(userId) },
      },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');
  }

  async getGeminiFiles(userId: number, workbenchId: number) {
    const workbenchResources = await this.getResources(userId, workbenchId);
    return this.gemini.toGeminiFiles(
      workbenchResources.map((wr) => wr.resource),
    );
  }

  async setResources(
    userId: number,
    workbenchId: number,
    { resourceIds }: SetResourcesDto,
  ) {
    const workbench = await this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: { ...ownerOrEditorFilter(userId) } },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');

    await this.db.$transaction([
      this.db.workbenchResource.deleteMany({ where: { workbenchId } }),
      this.db.workbenchResource.createMany({
        data: resourceIds.map((resourceId) => ({ workbenchId, resourceId })),
      }),
    ]);

    return this.db.workbenchResource.findMany({
      where: { workbenchId },
      include: { resource: true },
    });
  }
}
