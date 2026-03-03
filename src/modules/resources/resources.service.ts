import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { ResourceType } from '../../../generated/prisma/client.js';
import { unlink } from 'fs/promises';

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
}
