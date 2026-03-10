import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFlashcardDto } from './dto/create-flashcard.dto.js';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto.js';
import { DatabaseService } from '../../common/database/database.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { ResourcesService } from '../resources/resources.service.js';
import {
  anyMemberFilter,
  ownerOrEditorFilter,
} from '../../common/utils/workspace-filters.js';
import {
  buildFlashcardPrompt,
  type GeneratedFlashcardsResponse,
} from './flashcards.prompts.js';

const resourcesInclude = {
  resources: { include: { resource: true } },
} as const;

@Injectable()
export class FlashcardsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiService,
    private readonly resourcesSvc: ResourcesService,
  ) {}

  async create(userId: number, dto: CreateFlashcardDto) {
    const { workspaceId, difficulty, count = 5, resourceIds } = dto;

    const workspace = await this.db.workspace.findFirst({
      where: { id: workspaceId, ...ownerOrEditorFilter(userId) },
    });
    if (!workspace) throw new ForbiddenException('Access denied');

    await this.resourcesSvc.validateResourceIds(resourceIds, workspaceId);
    const files = await this.resourcesSvc.getGeminiFiles(
      resourceIds,
      workspaceId,
    );

    const prompt = buildFlashcardPrompt(count, difficulty);
    const rawText = await this.gemini.generateWithFiles(prompt, files);
    const parsed =
      this.gemini.parseJsonResponse<GeneratedFlashcardsResponse>(rawText);

    if (parsed.error === 'INSUFFICIENT_CONTENT') {
      throw new BadRequestException(
        'Source material is too short to generate flashcards.',
      );
    }
    if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
      throw new BadRequestException('Gemini returned no flashcards.');
    }

    return this.db.$transaction(async (tx) => {
      const flashcardRows = await tx.flashcard.createManyAndReturn({
        data: parsed.flashcards.map((f) => ({
          workspaceId,
          question: f.question,
          answer: f.answer,
          difficulty: difficulty ?? null,
        })),
      });

      await tx.flashcardResource.createMany({
        data: flashcardRows.flatMap((fc) =>
          resourceIds.map((resourceId) => ({
            flashcardId: fc.id,
            resourceId,
          })),
        ),
      });

      return tx.flashcard.findMany({
        where: { id: { in: flashcardRows.map((fc) => fc.id) } },
        include: resourcesInclude,
      });
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
      await this.resourcesSvc.validateResourceIds(
        resourceIds,
        flashcard.workspaceId,
      );

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
}
