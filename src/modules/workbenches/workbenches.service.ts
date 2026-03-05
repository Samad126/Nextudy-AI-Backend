import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkbenchDto } from './dto/create-workbench.dto.js';
import { UpdateWorkbenchDto } from './dto/update-workbench.dto.js';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class WorkbenchesService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: number, createWorkbenchDto: CreateWorkbenchDto) {
    const { name, workspaceId } = createWorkbenchDto;

    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

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
    return { message: 'Workbench deleted successfully' };
  }
}
