import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFlashcardDto } from './dto/create-flashcard.dto.js';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto.js';
import { DatabaseService } from '../../common/database/database.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';

const resourcesInclude = {
  resources: { include: { resource: true } },
} as const;

@Injectable()
export class FlashcardsService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: number, dto: CreateFlashcardDto) {
    const { workspaceId, question, answer, difficulty, resourceIds } = dto;

    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    await this.validateResources(resourceIds, workspaceId);

    return this.db.flashcard.create({
      data: {
        workspaceId,
        question,
        answer,
        difficulty,
        resources: {
          create: resourceIds.map((resourceId) => ({ resourceId })),
        },
      },
      include: resourcesInclude,
    });
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...anyMemberFilter(userId) },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.db.flashcard.findMany({
      where: { workspaceId },
      include: resourcesInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const flashcard = await this.db.flashcard.findFirst({
      where: { id, workspace: { ...anyMemberFilter(userId) } },
      include: resourcesInclude,
    });
    if (!flashcard) throw new NotFoundException('Flashcard not found');
    return flashcard;
  }

  async update(userId: number, id: number, dto: UpdateFlashcardDto) {
    const flashcard = await this.db.flashcard.findFirst({
      where: { id, workspace: { ...ownerOrEditorFilter(userId) } },
    });
    if (!flashcard) throw new NotFoundException('Flashcard not found');

    const { resourceIds, ...scalars } = dto;

    if (resourceIds !== undefined) {
      await this.validateResources(resourceIds, flashcard.workspaceId);

      return this.db.$transaction(async (tx) => {
        await tx.flashcardResource.deleteMany({ where: { flashcardId: id } });
        return tx.flashcard.update({
          where: { id },
          data: {
            ...scalars,
            resources: {
              create: resourceIds.map((resourceId) => ({ resourceId })),
            },
          },
          include: resourcesInclude,
        });
      });
    }

    return this.db.flashcard.update({
      where: { id },
      data: scalars,
      include: resourcesInclude,
    });
  }

  async remove(userId: number, id: number) {
    const flashcard = await this.db.flashcard.findFirst({
      where: { id, workspace: { ...ownerOrEditorFilter(userId) } },
    });
    if (!flashcard) throw new NotFoundException('Flashcard not found');

    await this.db.flashcard.delete({ where: { id } });
    return { message: 'Flashcard deleted successfully' };
  }

  private async validateResources(resourceIds: number[], workspaceId: number) {
    const resources = await this.db.resource.findMany({
      where: { id: { in: resourceIds }, workspaceId },
      select: { id: true },
    });
    if (resources.length !== resourceIds.length) {
      const found = resources.map((r) => r.id);
      const missing = resourceIds.filter((id) => !found.includes(id));
      throw new BadRequestException(
        `Resources not found or not in this workspace: ${missing.join(', ')}`,
      );
    }
  }
}
