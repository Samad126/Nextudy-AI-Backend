import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateFlashcardDto } from './dto/create-flashcard.dto.js';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto.js';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import { ResourcesService } from '../resources/resources.service.js';
import {
  buildFlashcardPrompt,
  type GeneratedFlashcardsResponse,
} from './flashcards.prompts.js';
import { FlashcardsRepository } from './flashcards.repository.js';

@Injectable()
export class FlashcardsService {
  private readonly logger = new Logger(FlashcardsService.name);

  constructor(
    private readonly repo: FlashcardsRepository,
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
    private readonly resourcesSvc: ResourcesService,
  ) {}

  async create(userId: number, dto: CreateFlashcardDto) {
    const { workspaceId, difficulty, count = 5, resourceIds } = dto;

    const workspace = await this.repo.findWorkspaceAsEditor(workspaceId, userId);
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

    this.logger.log(`Creating ${parsed.flashcards.length} flashcards in workspace ${workspaceId}`);

    return this.repo.createMany(
      workspaceId,
      parsed.flashcards.map((f) => ({
        question: f.question,
        answer: f.answer,
        difficulty: difficulty ?? null,
      })),
      resourceIds,
    );
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.repo.findWorkspaceAsMember(workspaceId, userId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.repo.findAll(workspaceId);
  }

  async findOne(userId: number, id: number) {
    const flashcard = await this.repo.findOneAsMember(id, userId);
    if (!flashcard) throw new NotFoundException('Flashcard not found');
    return flashcard;
  }

  async update(userId: number, id: number, dto: UpdateFlashcardDto) {
    const flashcard = await this.repo.findOneAsEditor(id, userId);
    if (!flashcard) throw new NotFoundException('Flashcard not found');

    const { resourceIds, ...scalars } = dto;

    if (resourceIds !== undefined) {
      await this.resourcesSvc.validateResourceIds(
        resourceIds,
        flashcard.workspaceId,
      );

      return this.repo.updateWithResources(id, scalars, resourceIds);
    }

    return this.repo.update(id, scalars);
  }

  async remove(userId: number, id: number) {
    const flashcard = await this.repo.findOneAsEditor(id, userId);
    if (!flashcard) throw new NotFoundException('Flashcard not found');

    await this.repo.delete(id);
    this.logger.log(`Flashcard ${id} deleted`);
    return { message: 'Flashcard deleted successfully' };
  }
}
