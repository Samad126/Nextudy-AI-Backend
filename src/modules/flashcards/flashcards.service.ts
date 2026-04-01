import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateFlashcardSetDto } from './dto/create-flashcard-set.dto.js';
import { UpdateFlashcardSetDto } from './dto/update-flashcard-set.dto.js';
import { UpdateFlashcardCardDto } from './dto/update-flashcard-card.dto.js';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import { ResourcesService } from '../resources/resources.service.js';
import {
  buildFlashcardPrompt,
  type GeneratedFlashcardsResponse,
} from './flashcards.prompts.js';
import { FlashcardsRepository } from './flashcards.repository.js';
import { WorkspacesRepository } from '../workspaces/workspaces.repository.js';

@Injectable()
export class FlashcardsService {
  private readonly logger = new Logger(FlashcardsService.name);

  constructor(
    private readonly repo: FlashcardsRepository,
    private readonly workspacesRepo: WorkspacesRepository,
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
    private readonly resourcesSvc: ResourcesService,
  ) {}

  async createSet(userId: number, dto: CreateFlashcardSetDto) {
    const {
      workspaceId,
      title,
      description,
      difficulty,
      count = 5,
      resourceIds,
    } = dto;

    const workspace = await this.workspacesRepo.findWorkspaceAsEditor(
      workspaceId,
      userId,
    );
    if (!workspace) throw new ForbiddenException('Access denied');

    await this.resourcesSvc.validateResourceIds(resourceIds, workspaceId);
    const { files, htmlTexts } = await this.resourcesSvc.getGeminiFiles(
      resourceIds,
      workspaceId,
    );

    const prompt = buildFlashcardPrompt(count, difficulty);
    const rawText = await this.gemini.generateWithFiles(prompt, files, htmlTexts);
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

    this.logger.log(
      `Creating flashcard set "${title}" with ${parsed.flashcards.length} cards in workspace ${workspaceId}`,
    );

    return this.repo.createSet(
      workspaceId,
      title,
      description,
      parsed.flashcards.map((f) => ({
        question: f.question,
        answer: f.answer,
        difficulty: difficulty ?? null,
      })),
      resourceIds,
    );
  }

  async findAll(userId: number, workspaceId: number) {
    const workspace = await this.workspacesRepo.findWorkspaceAsMember(
      workspaceId,
      userId,
    );
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.repo.findAll(workspaceId);
  }

  async findOne(userId: number, id: number) {
    const set = await this.repo.findOneAsMember(id, userId);
    if (!set) throw new NotFoundException('Flashcard set not found');
    return set;
  }

  async updateSet(userId: number, id: number, dto: UpdateFlashcardSetDto) {
    const set = await this.repo.findOneAsEditor(id, userId);
    if (!set) throw new NotFoundException('Flashcard set not found');

    return this.repo.updateSet(id, dto);
  }

  async removeSet(userId: number, id: number) {
    const set = await this.repo.findOneAsEditor(id, userId);
    if (!set) throw new NotFoundException('Flashcard set not found');

    await this.repo.deleteSet(id);
    this.logger.log(`Flashcard set ${id} deleted`);
    return { message: 'Flashcard set deleted successfully' };
  }

  async updateCard(
    userId: number,
    cardId: number,
    dto: UpdateFlashcardCardDto,
  ) {
    const card = await this.repo.findCardAsEditor(cardId, userId);
    if (!card) throw new NotFoundException('Flashcard card not found');

    return this.repo.updateCard(cardId, dto);
  }

  async removeCard(userId: number, cardId: number) {
    const card = await this.repo.findCardAsEditor(cardId, userId);
    if (!card) throw new NotFoundException('Flashcard card not found');

    await this.repo.deleteCard(cardId);
    return { message: 'Flashcard card deleted successfully' };
  }
}
