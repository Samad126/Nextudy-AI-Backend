import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerSchema,
  AnswerSource,
  CreateQuestionDto,
  GenerationMode,
  GenerationScope,
} from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import {
  buildAutoPrompt,
  buildManualPrompt,
  GeneratedQuestionsResponse,
  QuestionRaw,
} from './questions.prompts.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { DatabaseService } from '../../common/database/database.service.js';
import { Difficulty, QuestionType } from '../../../generated/prisma/client.js';

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class QuestionsService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly db: DatabaseService,
  ) {}

  async create(createQuestionDto: CreateQuestionDto) {
    const {
      workspaceId,
      workbenchId,
      generationMode,
      questions,
      answerSchema,
      answerSource,
      difficulty,
      generationScope,
      count,
      minWords = 250,
      answerLength,
    } = createQuestionDto;

    // 0. Validate option combinations
    if (
      generationMode === GenerationMode.USER_PROVIDED &&
      (answerSchema || difficulty || generationScope || count)
    ) {
      throw new BadRequestException(
        'answerSchema, difficulty, generationScope, and count are only valid for AI_GENERATED mode. Remove them when using USER_PROVIDED mode.',
      );
    }
    if (
      generationMode === GenerationMode.AI_GENERATED &&
      generationScope === GenerationScope.EXHAUSTIVE &&
      count !== undefined
    ) {
      throw new BadRequestException(
        'count is ignored when generationScope is EXHAUSTIVE. Remove count or switch to generationScope FIXED.',
      );
    }
    if (answerLength && answerSchema === AnswerSchema.MCQ) {
      throw new BadRequestException(
        'answerLength is only applicable to open-ended questions. Remove it or switch answerSchema to OPEN_ENDED or MIXED.',
      );
    }
    if (
      answerSource === AnswerSource.FILE &&
      answerSchema === AnswerSchema.MCQ
    ) {
      throw new BadRequestException(
        'answerSource FILE (verbatim) is incompatible with answerSchema MCQ. MCQ distractors are intentionally wrong answers and cannot be sourced verbatim from the document. Use answerSource MIXED or AI instead, or switch to OPEN_ENDED questions.',
      );
    }

    // 1. Verify workbench exists and fetch its Gemini-uploaded resources
    const workbench = await this.db.workbench.findFirst({
      where: { id: workbenchId, workspaceId },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');

    const workbenchResources = await this.db.workbenchResource.findMany({
      where: { workbenchId },
      include: { resource: true },
    });

    const files = workbenchResources
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

    // 2. Build prompt
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

    // 3. Call Gemini
    const rawText = await this.gemini.generateWithFiles(prompt, files);

    // 4. Parse JSON (strip any accidental markdown fences)
    let parsed: GeneratedQuestionsResponse;
    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      parsed = JSON.parse(cleaned) as GeneratedQuestionsResponse;
    } catch {
      throw new BadRequestException(
        `Gemini returned invalid JSON. Raw response: ${rawText.slice(0, 300)}`,
      );
    }

    if (parsed.error === 'INSUFFICIENT_CONTENT') {
      throw new BadRequestException(
        `Source material is too short. Minimum required: ${minWords} words (roughly one page of handwritten text).`,
      );
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new BadRequestException('Gemini returned no questions.');
    }

    // 5. Persist to DB
    const created = await Promise.all(
      parsed.questions.map((q) =>
        this.saveQuestion(q, workspaceId, workbenchId),
      ),
    );

    return created;
  }

  private async saveQuestion(
    q: QuestionRaw,
    workspaceId: number,
    workbenchId: number,
  ) {
    const difficultyMap: Record<string, Difficulty> = {
      EASY: Difficulty.EASY,
      MEDIUM: Difficulty.MEDIUM,
      HARD: Difficulty.HARD,
    };

    const question = await this.db.question.create({
      data: {
        workspaceId,
        workbenchId,
        title: q.title,
        question_type:
          q.question_type === 'mcq'
            ? QuestionType.mcq
            : QuestionType.open_ended,
        answer_source:
          q.answer_source === 'file' ? AnswerSource.FILE : AnswerSource.AI,
        difficulty: difficultyMap[q.difficulty] ?? Difficulty.MEDIUM,
        explanation: q.explanation ?? null,
      },
    });

    if (q.question_type === 'mcq' && q.choices?.length) {
      await this.db.mCQChoice.createMany({
        data: q.choices.map((c) => ({
          question_id: question.id,
          choice_text: c.choice_text,
          choice_order: c.choice_order,
          is_correct: c.is_correct,
        })),
      });
    }

    if (q.question_type === 'open_ended' && q.sample_answer) {
      await this.db.openEndedAnswer.create({
        data: {
          question_id: question.id,
          sample_answer: q.sample_answer,
          gradingKeywords: q.grading_keywords?.length
            ? {
                create: q.grading_keywords.map((k) => ({
                  keyword: k.keyword,
                  weight: k.weight,
                  is_required: k.is_required,
                })),
              }
            : undefined,
        },
      });
    }

    return this.db.question.findUnique({
      where: { id: question.id },
      include: {
        mcqChoices: true,
        openEndedAnswer: { include: { gradingKeywords: true } },
      },
    });
  }

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
