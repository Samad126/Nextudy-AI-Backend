import { BadRequestException, Injectable } from '@nestjs/common';
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
import { GeminiService } from '../gemini/gemini.service.js';
import { WorkbenchesService } from '../workbenches/workbenches.service.js';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly gemini: GeminiService,
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
    const files = await this.workbenches.getGeminiFiles(userId, workbenchId);

    // ── 2. Build prompt ──────────────────────────────────────────────────

    const prompt =
      generationMode === GenerationMode.USER_PROVIDED
        ? buildManualPrompt(questions!, answerSource)
        : buildAutoPrompt({
            answerSchema: answerSchema!,
            difficulty: difficulty!,
            generationScope: generationScope!,
            answerSource,
            count,
            minWords,
            answerLength,
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
    return this.repo.persistQuestions(parsed.questions, workbenchId);
  }

  async regenerate(
    userId: number,
    questionId: number,
    dto: RegenerateQuestionDto,
  ) {
    const { regenerateFromScratch, answerSource, questionType, difficulty } =
      dto;

    // ── 1. Fetch question + verify ownership ─────────────────────────────
    const question = await this.repo.findOneWithWorkbench(questionId, userId);

    // ── 2. Fetch Gemini-uploaded resources for the workbench ─────────────
    const files = await this.workbenches.getGeminiFiles(
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

  findAll() {
    return `This action returns all questions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} question`;
  }

  update(id: number, updateQuestionDto: UpdateQuestionDto) {
    return `This action updates a #${id} question`;
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }
}
