import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
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

  async exportPdf(
    userId: number,
    workbenchId: number,
  ): Promise<StreamableFile> {
    await this.workbenches.verifyMemberAccess(userId, workbenchId);
    const questions = await this.repo.findAllByWorkbench(workbenchId);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Workbench Questions', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Exported on ${new Date().toLocaleDateString()}`, {
        align: 'center',
      });
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    // ── Questions ────────────────────────────────────────────────────────────
    questions.forEach((q, index) => {
      const isLastQuestion = index === questions.length - 1;

      // Question title
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`${index + 1}. ${q.title}`);

      // Difficulty badge
      if (q.difficulty) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#888888')
          .text(`Difficulty: ${q.difficulty}`, { continued: false });
        doc.fillColor('#000000');
      }

      doc.moveDown(0.5);

      // MCQ choices
      if (q.question_type === 'mcq' && q.mcqChoices.length > 0) {
        q.mcqChoices.forEach((choice, i) => {
          const label = String.fromCharCode(65 + i);
          const prefix = choice.is_correct ? `✓ ${label}.` : `   ${label}.`;
          doc
            .fontSize(11)
            .font(choice.is_correct ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(choice.is_correct ? '#1a7a1a' : '#000000')
            .text(`${prefix} ${choice.choice_text}`, { indent: 20 });
        });
        doc.fillColor('#000000');
      }

      // Open-ended answer
      if (q.question_type === 'open_ended' && q.openEndedAnswer) {
        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .fillColor('#333333')
          .text('Sample Answer:', { indent: 20 });
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#000000')
          .text(q.openEndedAnswer.sample_answer, { indent: 20 });
      }

      // Explanation
      if (q.explanation) {
        doc.moveDown(0.3);
        doc
          .fontSize(9)
          .font('Helvetica-Oblique')
          .fillColor('#555555')
          .text(`Explanation: ${q.explanation}`, { indent: 20 });
        doc.fillColor('#000000');
      }

      if (!isLastQuestion) {
        doc.moveDown(1);
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .strokeColor('#cccccc')
          .stroke();
        doc.moveDown(1);
      }
    });

    doc.end();

    await new Promise<void>((resolve) => doc.on('end', resolve));

    const buffer = Buffer.concat(chunks);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="questions.pdf"',
    });
  }
}
