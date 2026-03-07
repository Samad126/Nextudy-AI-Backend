import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateQuestionDto,
  GenerationMode,
} from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { buildAutoPrompt, buildManualPrompt } from './questions.prompts.js';
import type { GeneratedQuestionsResponse } from './questions.prompts.js';
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
    const resources = await this.workbenches.getResources(userId, workbenchId);
    const files = resources
      .filter((wr) => wr.resource.store_id && wr.resource.mime_type)
      .map((wr) => ({
        uri: wr.resource.store_id as string,
        mimeType: wr.resource.mime_type as string,
      }));

    if (files.length === 0) {
      throw new BadRequestException(
        'No uploaded resources found in this workbench. Upload resources to Gemini before generating questions.',
      );
    }

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
