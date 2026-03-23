import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CreateQuestionDto,
  GenerationMode,
} from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { RegenerateQuestionDto } from './dto/regenerate-question.dto.js';
import {
  buildAutoPrompt,
  buildManualPrompt,
  buildRegeneratePrompt,
} from './questions.prompts.js';
import type { GeneratedQuestionsResponse } from './questions.prompts.js';
import { Difficulty } from '../../../generated/prisma/client.js';
import { validateQuestionOptions } from './questions.validators.js';
import { QuestionsRepository } from './questions.repository.js';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import { WorkbenchesService } from '../workbenches/workbenches.service.js';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
    private readonly workbenches: WorkbenchesService,
    private readonly repo: QuestionsRepository,
  ) {}

  async create(userId: number, createQuestionDto: CreateQuestionDto) {
    const {
      workbenchId,
      generationMode,
      questions,
      answerSource,
      minWords = 250,
      answerLength,
      answerSchema,
      difficulty,
      generationScope,
      count,
    } = createQuestionDto;

    // ── 0. Validate ──────────────────────────────────────────────────────
    validateQuestionOptions(createQuestionDto);

    // ── 1. Fetch Gemini-uploaded resources ────────────
    const { files, resourceMeta } =
      await this.workbenches.getGeminiFilesWithMeta(userId, workbenchId);

    // ── 2. Build prompt ──────────────────────────────────────────────────

    const prompt =
      generationMode === GenerationMode.USER_PROVIDED
        ? buildManualPrompt(questions!, answerSource, resourceMeta)
        : buildAutoPrompt({
            answerSchema: answerSchema!,
            difficulty: difficulty!,
            generationScope: generationScope!,
            answerSource,
            count,
            minWords,
            answerLength,
            resourceMeta,
          });

    // ── 3. Call Gemini ───────────────────────────────────────────────────

    const rawText = await this.gemini.generateWithFiles(prompt, files);

    // ── 4. Parse & validate Gemini response ──────────────────────────────
    const parsed =
      this.gemini.parseJsonResponse<GeneratedQuestionsResponse>(rawText);

    if (parsed.error === 'INSUFFICIENT_CONTENT') {
      throw new BadRequestException(
        `Source material is too short. Minimum required: ${minWords} words (roughly one page of handwritten text).`,
      );
    }
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new BadRequestException('Gemini returned no questions.');
    }

    // ── 5. Persist to DB ─────────────────────────────────────────────────
    this.logger.log(
      `Persisting ${parsed.questions.length} questions for workbench ${workbenchId}`,
    );
    return this.repo.persistQuestions(parsed.questions, workbenchId);
  }

  async regenerate(
    userId: number,
    questionId: number,
    dto: RegenerateQuestionDto,
  ) {
    const { regenerateFromScratch, answerSource, questionType, difficulty } =
      dto;

    // ── 1. Fetch question + verify membership ────────────────────────────
    const question = await this.repo.findById(questionId);
    await this.workbenches.verifyMemberAccess(userId, question.workbenchId);

    // ── 2. Fetch Gemini-uploaded resources for the workbench ─────────────
    const { files, resourceMeta } =
      await this.workbenches.getGeminiFilesWithMeta(
        userId,
        question.workbenchId,
      );

    // ── 3. Build prompt ──────────────────────────────────────────────────
    const resolvedDifficulty: Difficulty =
      difficulty ?? (question.difficulty as Difficulty) ?? Difficulty.MEDIUM;

    const prompt = buildRegeneratePrompt({
      regenerateFromScratch,
      originalTitle: question.title,
      questionType,
      difficulty: resolvedDifficulty,
      answerSource,
      resourceMeta,
    });

    // ── 4. Call Gemini ───────────────────────────────────────────────────
    const rawText = await this.gemini.generateWithFiles(prompt, files);

    // ── 5. Parse & validate ──────────────────────────────────────────────
    const parsed =
      this.gemini.parseJsonResponse<GeneratedQuestionsResponse>(rawText);

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new BadRequestException('Gemini returned no questions.');
    }

    // ── 6. Replace in DB ─────────────────────────────────────────────────
    return this.repo.replaceQuestion(
      questionId,
      parsed.questions[0],
      resolvedDifficulty,
    );
  }

  // ── CRUD placeholders ────────────────────────────────────────────────────

  async findAll(userId: number, workbenchId: number) {
    await this.workbenches.verifyMemberAccess(userId, workbenchId);
    return this.repo.findAllByWorkbench(workbenchId);
  }

  findOne(id: number) {
    return `This action returns a #${id} question`;
  }

  async update(
    userId: number,
    id: number,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.repo.findById(id);
    await this.workbenches.verifyEditorAccess(userId, question.workbenchId);
    return this.repo.updateQuestion(id, updateQuestionDto);
  }

  async remove(userId: number, id: number) {
    const question = await this.repo.findById(id);
    await this.workbenches.verifyEditorAccess(userId, question.workbenchId);
    this.logger.log(`Question ${id} deleted`);
    return this.repo.deleteById(id);
  }
}
