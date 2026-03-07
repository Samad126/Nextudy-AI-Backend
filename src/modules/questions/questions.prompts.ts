import {
  AnswerLengthDto,
  AnswerSchema,
  AnswerSource,
  GenerationScope,
  GenerationDifficulty,
} from './dto/create-question.dto.js';

// ── Gemini response types ──────────────────────────────────────────────────

export interface MCQChoiceRaw {
  choice_text: string;
  choice_order: number;
  is_correct: boolean;
}

export interface GradingKeywordRaw {
  keyword: string;
  weight: number;
  is_required: boolean;
}

export interface QuestionRaw {
  title: string;
  question_type: 'mcq' | 'open_ended';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  answer_source: 'file' | 'ai';
  explanation?: string;
  choices?: MCQChoiceRaw[];
  sample_answer?: string;
  grading_keywords?: GradingKeywordRaw[];
}

export interface GeneratedQuestionsResponse {
  error?: string;
  questions: QuestionRaw[];
}

// ── Shared JSON schema string ──────────────────────────────────────────────

const JSON_SCHEMA = `{
  "questions": [
    {
      "title": "Question text",
      "question_type": "mcq",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "answer_source": "file" | "ai",
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
      "answer_source": "file" | "ai",
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

export function buildAutoPrompt(dto: {
  answerSchema: AnswerSchema;
  difficulty: GenerationDifficulty;
  generationScope: GenerationScope;
  answerSource: AnswerSource;
  count?: number;
  minWords: number;
  answerLength?: AnswerLengthDto;
}): string {
  const {
    answerSchema,
    difficulty,
    generationScope,
    answerSource,
    count,
    minWords,
    answerLength,
  } = dto;

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
    generationScope === GenerationScope.FIXED
      ? `Generate exactly ${count} questions.`
      : 'Generate as many high-quality, non-redundant questions as the material supports (aim for comprehensive coverage of all topics).';

  const answerSourceInstruction =
    answerSource === AnswerSource.FILE
      ? 'ANSWER SOURCE — FILE (VERBATIM): All correct answers, sample answers, explanations, and grading keywords must be copied verbatim or near-verbatim from the provided file content — exact sentences, phrases, or words as they appear in the document. Do not paraphrase, rephrase, or add information not literally present in the files. A user must be able to find every answer by Ctrl+F searching the exact text in the source document. For MCQ, the correct choice must be verbatim from the file; the three distractors may be plausibly invented since they are intentionally wrong.'
      : answerSource === AnswerSource.MIXED
        ? 'ANSWER SOURCE — MIXED: Use verbatim text from the files for question titles and correct answers where possible, but freely use your broader knowledge to write explanations, enrich sample answers, and craft MCQ distractors.'
        : 'ANSWER SOURCE — AI: Use the provided files as the primary source for topics and questions, but you may use your broader knowledge to write clear explanations, well-phrased distractors, and comprehensive sample answers beyond what is literally stated in the files.';

  return `You are an expert educational content creator. Analyze the provided study material(s) and generate exam/quiz questions based on their content.

PRE-CHECK: Before generating, estimate the total word count of the provided material. If it contains fewer than ${minWords} words, return { "error": "INSUFFICIENT_CONTENT", "questions": [] } and stop.

INSTRUCTIONS:
1. ${countInstruction}
2. ${questionTypeInstruction}
3. ${difficultyInstruction}
4. ${answerSourceInstruction}
5. Avoid duplicate or very similar questions.
6. For MCQ: only one choice must have is_correct: true; the other three must be plausible distractors.
7. For open_ended: ${answerLength ? `sample_answer should be approximately ${answerLength.amount} ${answerLength.unit} long` : 'sample_answer should be 2–5 sentences'}; grading_keywords should reflect the most important concepts needed in a correct answer.
8. The "explanation" field is mandatory for all questions.
9. Set answer_source to "file" if the correct answer / sample answer was taken verbatim or near-verbatim from the document, or "ai" if you used your own knowledge to write or significantly rephrase it.

OUTPUT FORMAT:
Return ONLY raw JSON — no markdown, no code fences, no extra text before or after. The JSON must strictly follow this schema:

${JSON_SCHEMA}`;
}

export function buildManualPrompt(
  rawQuestions: string,
  answerSource: AnswerSource,
): string {
  const answerSourceInstruction =
    answerSource === AnswerSource.FILE
      ? 'ANSWER SOURCE — FILE (VERBATIM): All correct answers, sample answers, explanations, and grading keywords must be copied verbatim or near-verbatim from the provided file content — exact sentences, phrases, or words as they appear in the document. Do not paraphrase, rephrase, or add information not literally present in the files. A user must be able to find every answer by Ctrl+F searching the exact text in the source document. For MCQ, the correct choice must be verbatim from the file; the three distractors may be plausibly invented since they are intentionally wrong.'
      : answerSource === AnswerSource.MIXED
        ? 'ANSWER SOURCE — MIXED: Use verbatim text from the files for question titles and correct answers where possible, but freely use your broader knowledge to write explanations, enrich sample answers, and craft MCQ distractors.'
        : 'ANSWER SOURCE — AI: You may use your broader knowledge to enrich explanations, sample answers, and distractors beyond what is literally in the files.';

  return `You are an expert educational content formatter. The user has written the following questions in free-form text. Your job is to parse them and structure each question into the exact JSON schema below.

Rules:
- If a question has multiple-choice options, set question_type to "mcq" and populate choices (exactly 4, one correct).
- If a question is open-ended (no choices), set question_type to "open_ended" and provide a sample_answer plus at least 3 grading_keywords.
- Infer a difficulty (EASY, MEDIUM, or HARD) for each question based on its complexity.
- Write a concise explanation for each question.
- Do not add or remove questions — structure exactly what the user provided.
- ${answerSourceInstruction}
- Set answer_source to "file" if the correct answer / sample answer was taken verbatim or near-verbatim from the document, or "ai" if you used your own knowledge to write or significantly rephrase it.

OUTPUT FORMAT:
Return ONLY raw JSON — no markdown, no code fences, no extra text. Follow this schema exactly:

${JSON_SCHEMA}

USER-PROVIDED QUESTIONS:
${rawQuestions}`;
}
