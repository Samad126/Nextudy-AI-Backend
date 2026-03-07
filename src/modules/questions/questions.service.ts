import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AutoMode,
  AnswerSchema,
  AnswerSource,
  CreateQuestionDto,
  GenerationDifficulty,
  QuestionMode,
} from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { DatabaseService } from '../../common/database/database.service.js';
import { Difficulty, QuestionType } from '../../../generated/prisma/client.js';

// ── Gemini response types ──────────────────────────────────────────────────

interface MCQChoiceRaw {
  choice_text: string;
  choice_order: number;
  is_correct: boolean;
}

interface GradingKeywordRaw {
  keyword: string;
  weight: number;
  is_required: boolean;
}

interface QuestionRaw {
  title: string;
  question_type: 'mcq' | 'open_ended';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation?: string;
  choices?: MCQChoiceRaw[];
  sample_answer?: string;
  grading_keywords?: GradingKeywordRaw[];
}

interface GeneratedQuestionsResponse {
  questions: QuestionRaw[];
}

// ── Shared JSON schema string ──────────────────────────────────────────────

const JSON_SCHEMA = `{
  "questions": [
    {
      "title": "Question text",
      "question_type": "mcq",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "explanation": "Brief explanation of why the answer is correct",
      "choices": [
        { "choice_text": "Option A", "choice_order": 1, "is_correct": false },
        { "choice_text": "Option B", "choice_order": 2, "is_correct": true },
        { "choice_text": "Option C", "choice_order": 3, "is_correct": false },
        { "choice_text": "Option D", "choice_order": 4, "is_correct": false }
      ]
    },
    {
      "title": "Question text",
      "question_type": "open_ended",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "explanation": "Key concepts the answer should cover",
      "sample_answer": "A well-structured sample answer",
      "grading_keywords": [
        { "keyword": "key concept", "weight": 1.0, "is_required": true },
        { "keyword": "supporting idea", "weight": 0.5, "is_required": false }
      ]
    }
  ]
}`;

// ── Prompt builders ────────────────────────────────────────────────────────

function buildAutoPrompt(dto: {
  answerSchema: AnswerSchema;
  difficulty: GenerationDifficulty;
  autoMode: AutoMode;
  answerSource: AnswerSource;
  count?: number;
}): string {
  const { answerSchema, difficulty, autoMode, answerSource, count } = dto;

  const questionTypeInstruction =
    answerSchema === AnswerSchema.MCQ
      ? 'All questions must be of type "mcq". Each MCQ must have exactly 4 choices with exactly one marked is_correct: true.'
      : answerSchema === AnswerSchema.OPEN_ENDED
        ? 'All questions must be of type "open_ended". Each open-ended question must have a sample_answer and at least 3 grading_keywords.'
        : 'Generate a mix of "mcq" and "open_ended" questions. MCQs must have exactly 4 choices with exactly one correct. Open-ended questions must have a sample_answer and at least 3 grading_keywords.';

  const difficultyInstruction =
    difficulty === GenerationDifficulty.MIXED
      ? 'Use a balanced mix of EASY, MEDIUM, and HARD difficulties across the questions.'
      : `All questions must have difficulty "${difficulty}".`;

  const countInstruction =
    autoMode === AutoMode.COUNT
      ? `Generate exactly ${count} questions.`
      : 'Generate as many high-quality, non-redundant questions as the material supports (aim for comprehensive coverage of all topics).';

  const answerSourceInstruction =
    answerSource === AnswerSource.FILE
      ? 'ANSWER SOURCE — FILE (VERBATIM): All answers, sample answers, MCQ choices, explanations, and grading keywords must be copied verbatim or near-verbatim from the provided file content — exact sentences, phrases, or words as they appear in the document. Do not paraphrase, rephrase, or add any information not literally present in the files. A user must be able to find every answer by searching (Ctrl+F) the exact text in the source document.'
      : 'ANSWER SOURCE — AI: Use the provided files as the primary source for topics and questions, but you may use your broader knowledge to write clear explanations, well-phrased distractors, and comprehensive sample answers beyond what is literally stated in the files.';

  return `You are an expert educational content creator. Analyze the provided study material(s) and generate exam/quiz questions based on their content.

INSTRUCTIONS:
1. ${countInstruction}
2. ${questionTypeInstruction}
3. ${difficultyInstruction}
4. ${answerSourceInstruction}
5. Avoid duplicate or very similar questions.
6. For MCQ: only one choice must have is_correct: true; the other three must be plausible distractors.
7. For open_ended: sample_answer should be 2-5 sentences; grading_keywords should reflect the most important concepts needed in a correct answer.
8. The "explanation" field is mandatory for all questions.

OUTPUT FORMAT:
Return ONLY raw JSON — no markdown, no code fences, no extra text before or after. The JSON must strictly follow this schema:

${JSON_SCHEMA}`;
}

function buildManualPrompt(
  rawQuestions: string,
  answerSource: AnswerSource,
): string {
  const answerSourceInstruction =
    answerSource === AnswerSource.FILE
      ? 'ANSWER SOURCE — FILE (VERBATIM): All answers, sample answers, MCQ choices, explanations, and grading keywords must be copied verbatim or near-verbatim from the provided file content — exact sentences, phrases, or words as they appear in the document. Do not paraphrase, rephrase, or add any information not literally present in the files. A user must be able to find every answer by searching (Ctrl+F) the exact text in the source document.'
      : 'ANSWER SOURCE — AI: You may use your broader knowledge to enrich explanations, sample answers, and distractors beyond what is literally in the files.';

  return `You are an expert educational content formatter. The user has written the following questions in free-form text. Your job is to parse them and structure each question into the exact JSON schema below.

Rules:
- If a question has multiple-choice options, set question_type to "mcq" and populate choices (exactly 4, one correct).
- If a question is open-ended (no choices), set question_type to "open_ended" and provide a sample_answer plus at least 3 grading_keywords.
- Infer a difficulty (EASY, MEDIUM, or HARD) for each question based on its complexity.
- Write a concise explanation for each question.
- Do not add or remove questions — structure exactly what the user provided.
- ${answerSourceInstruction}

OUTPUT FORMAT:
Return ONLY raw JSON — no markdown, no code fences, no extra text. Follow this schema exactly:

${JSON_SCHEMA}

USER-PROVIDED QUESTIONS:
${rawQuestions}`;
}

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
      mode,
      questions,
      answerSchema,
      answerSource,
      difficulty,
      autoMode,
      count,
    } = createQuestionDto;

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
      mode === QuestionMode.MANUAL
        ? buildManualPrompt(questions!, answerSource)
        : buildAutoPrompt({
            answerSchema: answerSchema!,
            difficulty: difficulty!,
            autoMode: autoMode!,
            answerSource,
            count,
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

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new BadRequestException('Gemini returned no questions.');
    }

    // 5. Persist to DB
    const created = await Promise.all(
      parsed.questions.map((q) =>
        this.saveQuestion(q, workspaceId, workbenchId, answerSource),
      ),
    );

    return created;
  }

  private async saveQuestion(
    q: QuestionRaw,
    workspaceId: number,
    workbenchId: number,
    answerSource: AnswerSource,
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
        answer_source: answerSource,
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
