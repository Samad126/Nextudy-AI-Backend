import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { ResourceType } from '../../../generated/prisma/client.js';
import { unlink } from 'fs/promises';
import { CreateResourceGroupDto } from './dto/create-resource-group.dto.js';
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto.js';
import {
  ownerOrEditorFilter,
  anyMemberFilter,
} from '../../common/utils/workspace-filters.js';

@Injectable()
export class ResourcesService {
  constructor(private db: DatabaseService) {}

  private getResourceType(mimetype: string): ResourceType {
    if (mimetype === 'application/pdf') return ResourceType.PDF;
    if (mimetype.startsWith('image/')) return ResourceType.IMAGE;
    if (mimetype === 'text/plain') return ResourceType.TXT;
    return ResourceType.DOC;
  }

  async create(userId: number, workspaceId: number, file: Express.Multer.File) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    return this.db.resource.create({
      data: {
        workspaceId,
        name: file.originalname,
        filePath: file.path,
        type: this.getResourceType(file.mimetype),
        file_size: file.size,
        mime_type: file.mimetype,
      },
      omit: { filePath: true },
    });
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });

    if (!workspace) throw new NotFoundException('Resources not found');

    return this.db.resource.findMany({
      where: { workspaceId },
      omit: { filePath: true },
    });
  }

  async getFilePath(userId: number, resourceId: number) {
    const resource = await this.db.resource.findFirst({
      where: {
        id: resourceId,
        workspace: anyMemberFilter(userId),
      },
    });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async remove(userId: number, resourceId: number) {
    const resource = await this.db.resource.findFirst({
      where: {
        id: resourceId,
        workspace: ownerOrEditorFilter(userId),
      },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    await unlink(resource.filePath);
    await this.db.resource.delete({ where: { id: resourceId } });

    return { message: 'Resource deleted successfully' };
  }

  async findAllGroups(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });

    if (!workspace) throw new NotFoundException('Resource Groups not found');

    return this.db.resourceGroups.findMany({
      where: { workspaceId },
      include: { resources: true },
    });
  }

  async createGroup(
    userId: number,
    createResourceGroupDto: CreateResourceGroupDto,
  ) {
    const { workspaceId, ...groupData } = createResourceGroupDto;

    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    return this.db.resourceGroups.create({
      data: { workspaceId, ...groupData },
    });
  }

  async updateGroup(
    userId: number,
    groupId: number,
    dto: UpdateResourceGroupDto,
  ) {
    const group = await this.db.resourceGroups.findFirst({
      where: {
        id: groupId,
        workspace: ownerOrEditorFilter(userId),
      },
    });
    if (!group) throw new NotFoundException('Resource group not found');

    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { name: dto.name },
    });
  }

  async addResourceToGroup(
    userId: number,
    groupId: number,
    resourceId: number,
  ) {
    const [group, resource] = await Promise.all([
      this.db.resourceGroups.findFirst({
        where: { id: groupId, workspace: ownerOrEditorFilter(userId) },
      }),
      this.db.resource.findFirst({ where: { id: resourceId } }),
    ]);
    if (!group) throw new NotFoundException('Resource group not found');
    if (!resource) throw new NotFoundException('Resource not found');

    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { resources: { connect: { id: resourceId } } },
    });
  }

  async removeResourceFromGroup(
    userId: number,
    groupId: number,
    resourceId: number,
  ) {
    const [group, resource] = await Promise.all([
      this.db.resourceGroups.findFirst({
        where: { id: groupId, workspace: ownerOrEditorFilter(userId) },
      }),
      this.db.resource.findFirst({ where: { id: resourceId } }),
    ]);
    if (!group) throw new NotFoundException('Resource group not found');
    if (!resource) throw new NotFoundException('Resource not found');

    await this.db.resourceGroups.update({
      where: { id: groupId },
      data: { resources: { disconnect: { id: resourceId } } },
    });

    return { message: 'Resource removed from group successfully' };
  }
}
