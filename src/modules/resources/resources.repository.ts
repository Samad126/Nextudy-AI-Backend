import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { ResourceType } from '../../../generated/prisma/client.js';
import {
  ownerOrEditorFilter,
  anyMemberFilter,
} from '../../common/utils/workspace-filters.js';
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto.js';

@Injectable()
export class ResourcesRepository {
  constructor(private readonly db: DatabaseService) {}

  createResource(data: {
    workspaceId: number;
    name: string;
    filePath: string;
    type: ResourceType;
    file_size: number;
    mime_type: string;
    store_id: string;
  }) {
    return this.db.resource.create({
      data,
      omit: { filePath: true },
    });
  }

  findAllResources(workspaceId: number) {
    return this.db.resource.findMany({
      where: { workspaceId },
      omit: { filePath: true },
    });
  }

  findResourceAsMember(resourceId: number, userId: number) {
    return this.db.resource.findFirst({
      where: {
        id: resourceId,
        workspace: anyMemberFilter(userId),
      },
    });
  }

  findResourceAsEditor(resourceId: number, userId: number) {
    return this.db.resource.findFirst({
      where: {
        id: resourceId,
        workspace: ownerOrEditorFilter(userId),
      },
    });
  }

  deleteResource(resourceId: number) {
    return this.db.resource.delete({ where: { id: resourceId } });
  }

  findAllGroups(workspaceId: number) {
    return this.db.resourceGroups.findMany({
      where: { workspaceId },
      include: { resources: true },
    });
  }

  createGroup(workspaceId: number, groupData: { name: string }) {
    return this.db.resourceGroups.create({
      data: { workspaceId, ...groupData },
    });
  }

  findGroupAsEditor(groupId: number, userId: number) {
    return this.db.resourceGroups.findFirst({
      where: {
        id: groupId,
        workspace: ownerOrEditorFilter(userId),
      },
    });
  }

  updateGroup(groupId: number, dto: UpdateResourceGroupDto) {
    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { name: dto.name },
    });
  }

  findResourceById(resourceId: number) {
    return this.db.resource.findFirst({ where: { id: resourceId } });
  }

  connectResourceToGroup(groupId: number, resourceId: number) {
    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { resources: { connect: { id: resourceId } } },
    });
  }

  disconnectResourceFromGroup(groupId: number, resourceId: number) {
    return this.db.resourceGroups.update({
      where: { id: groupId },
      data: { resources: { disconnect: { id: resourceId } } },
    });
  }

  findResourcesByIds(resourceIds: number[], workspaceId: number) {
    return this.db.resource.findMany({
      where: { id: { in: resourceIds }, workspaceId },
      select: { id: true },
    });
  }

  updateResourceContent(resourceId: number, content: string) {
    return this.db.resource.update({
      where: { id: resourceId },
      data: { content },
    });
  }

  findResourcesWithStore(resourceIds: number[], workspaceId: number) {
    return this.db.resource.findMany({
      where: { id: { in: resourceIds }, workspaceId },
      select: { store_id: true, mime_type: true, type: true, content: true },
    });
  }
}
