import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { ResourceType } from '../../../generated/prisma/client.js';
import { unlink } from 'fs/promises';
import { CreateResourceGroupDto } from './dto/create-resource-group.dto.js';
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto.js';

@Injectable()
export class ResourcesService {
  constructor(private db: DatabaseService) {}

  private getResourceType(mimetype: string): ResourceType {
    if (mimetype === 'application/pdf') return ResourceType.PDF;
    if (mimetype.startsWith('image/')) return ResourceType.IMAGE;
    if (mimetype === 'text/plain') return ResourceType.TXT;
    return ResourceType.DOC;
  }

  async create(workspaceId: number, file: Express.Multer.File) {
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

  async findAll(workspaceId: number) {
    return this.db.resource.findMany({
      where: { workspaceId },
      omit: { filePath: true },
    });
  }

  async getFilePath(workspaceId: number, resourceId: number) {
    const resource = await this.db.resource.findFirst({
      where: { id: resourceId, workspaceId },
    });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async remove(workspaceId: number, resourceId: number) {
    const resource = await this.db.resource.findFirst({
      where: { id: resourceId, workspaceId },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    await unlink(resource.filePath);
    await this.db.resource.delete({ where: { id: resourceId } });

    return { message: 'Resource deleted successfully' };
  }

  async findAllGroups(workspaceId: number) {
    return await this.db.resourceGroups.findMany({
      where: { workspaceId },
      include: { resources: true },
    });
  }

  async createGroup(
    workspaceId: number,
    createResourceGroupDto: CreateResourceGroupDto,
  ) {
    return this.db.resourceGroups.create({
      data: { workspaceId, ...createResourceGroupDto },
    });
  }

  async updateGroup(
    workspaceId: number,
    groupId: number,
    dto: UpdateResourceGroupDto,
  ) {
    const group = await this.db.resourceGroups.findFirst({
      where: { id: groupId, workspaceId },
    });
    if (!group) throw new NotFoundException('Resource group not found');

    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { name: dto.name },
    });
  }

  async addResourceToGroup(
    workspaceId: number,
    groupId: number,
    resourceId: number,
  ) {
    const [group, resource] = await Promise.all([
      this.db.resourceGroups.findFirst({ where: { id: groupId, workspaceId } }),
      this.db.resource.findFirst({ where: { id: resourceId, workspaceId } }),
    ]);
    if (!group) throw new NotFoundException('Resource group not found');
    if (!resource) throw new NotFoundException('Resource not found');

    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { resources: { connect: { id: resourceId } } },
    });
  }

  async removeResourceFromGroup(
    workspaceId: number,
    groupId: number,
    resourceId: number,
  ) {
    const [group, resource] = await Promise.all([
      this.db.resourceGroups.findFirst({ where: { id: groupId, workspaceId } }),
      this.db.resource.findFirst({ where: { id: resourceId, workspaceId } }),
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
