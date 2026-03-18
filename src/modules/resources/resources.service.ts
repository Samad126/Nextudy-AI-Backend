import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResourceType } from '../../../generated/prisma/client.js';
import { unlink } from 'fs/promises';
import { CreateResourceGroupDto } from './dto/create-resource-group.dto.js';
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto.js';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import { ResourcesRepository } from './resources.repository.js';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    private readonly repo: ResourcesRepository,
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
  ) {}

  private getResourceType(mimetype: string): ResourceType {
    if (mimetype === 'application/pdf') return ResourceType.PDF;
    if (mimetype.startsWith('image/')) return ResourceType.IMAGE;
    if (mimetype === 'text/plain') return ResourceType.TXT;
    return ResourceType.DOC;
  }

  async create(userId: number, workspaceId: number, file: Express.Multer.File) {
    const workspace = await this.repo.findWorkspaceAsEditor(
      workspaceId,
      userId,
    );
    if (!workspace) throw new ForbiddenException('Access denied');

    const storeId = await this.gemini.uploadFile(
      file.path,
      file.mimetype,
      file.originalname,
    );

    const resource = await this.repo.createResource({
      workspaceId,
      name: file.originalname,
      filePath: file.path,
      type: this.getResourceType(file.mimetype),
      file_size: file.size,
      mime_type: file.mimetype,
      store_id: storeId,
    });

    this.logger.log(`Resource created in workspace ${workspaceId}`);
    return resource;
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.repo.findWorkspaceAsMember(
      workspaceId,
      userId,
    );
    if (!workspace) throw new NotFoundException('Resources not found');

    return this.repo.findAllResources(workspaceId);
  }

  async getFilePath(userId: number, resourceId: number) {
    const resource = await this.repo.findResourceAsMember(resourceId, userId);
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async remove(userId: number, resourceId: number) {
    const resource = await this.repo.findResourceAsEditor(resourceId, userId);
    if (!resource) throw new NotFoundException('Resource not found');

    await Promise.all([
      unlink(resource.filePath),
      this.gemini.deleteFile(resource.store_id),
    ]);
    await this.repo.deleteResource(resourceId);
    this.logger.log(`Resource ${resourceId} deleted`);
    return { message: 'Resource deleted successfully' };
  }

  async findAllGroups(userId: number, workspaceId: number) {
    const workspace = await this.repo.findWorkspaceAsMember(
      workspaceId,
      userId,
    );
    if (!workspace) throw new NotFoundException('Resource Groups not found');

    return this.repo.findAllGroups(workspaceId);
  }

  async createGroup(
    userId: number,
    createResourceGroupDto: CreateResourceGroupDto,
  ) {
    const { workspaceId, ...groupData } = createResourceGroupDto;

    const workspace = await this.repo.findWorkspaceAsEditor(
      workspaceId,
      userId,
    );
    if (!workspace) throw new ForbiddenException('Access denied');

    this.logger.log(`Resource group created in workspace ${workspaceId}`);
    return this.repo.createGroup(workspaceId, groupData);
  }

  async updateGroup(
    userId: number,
    groupId: number,
    dto: UpdateResourceGroupDto,
  ) {
    const group = await this.repo.findGroupAsEditor(groupId, userId);
    if (!group) throw new NotFoundException('Resource group not found');

    return this.repo.updateGroup(groupId, dto);
  }

  async addResourceToGroup(
    userId: number,
    groupId: number,
    resourceId: number,
  ) {
    const [group, resource] = await Promise.all([
      this.repo.findGroupAsEditor(groupId, userId),
      this.repo.findResourceById(resourceId),
    ]);
    if (!group) throw new NotFoundException('Resource group not found');
    if (!resource) throw new NotFoundException('Resource not found');

    return this.repo.connectResourceToGroup(groupId, resourceId);
  }

  async validateResourceIds(
    resourceIds: number[],
    workspaceId: number,
  ): Promise<void> {
    const found = await this.repo.findResourcesByIds(resourceIds, workspaceId);
    if (found.length !== resourceIds.length) {
      const foundIds = found.map((r) => r.id);
      const missing = resourceIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Resources not found or not in this workspace: ${missing.join(', ')}`,
      );
    }
  }

  async getGeminiFiles(
    resourceIds: number[],
    workspaceId: number,
  ): Promise<{ uri: string; mimeType: string }[]> {
    const resources = await this.repo.findResourcesWithStore(
      resourceIds,
      workspaceId,
    );
    return this.gemini.toGeminiFiles(resources);
  }

  async removeResourceFromGroup(
    userId: number,
    groupId: number,
    resourceId: number,
  ) {
    const [group, resource] = await Promise.all([
      this.repo.findGroupAsEditor(groupId, userId),
      this.repo.findResourceById(resourceId),
    ]);
    if (!group) throw new NotFoundException('Resource group not found');
    if (!resource) throw new NotFoundException('Resource not found');

    await this.repo.disconnectResourceFromGroup(groupId, resourceId);

    return { message: 'Resource removed from group successfully' };
  }
}
