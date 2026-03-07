import { BadRequestException } from '@nestjs/common';
import {
  AnswerSchema,
  AnswerSource,
  CreateQuestionDto,
  GenerationMode,
  GenerationScope,
} from './dto/create-question.dto.js';

export function validateQuestionOptions(dto: CreateQuestionDto): void {
  const {
    generationMode,
    answerSchema,
    answerSource,
    answerLength,
    difficulty,
    generationScope,
    count,
  } = dto;

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

  if (answerSource === AnswerSource.FILE && answerSchema === AnswerSchema.MCQ) {
    throw new BadRequestException(
      'answerSource FILE (verbatim) is incompatible with answerSchema MCQ. MCQ distractors are intentionally wrong answers and cannot be sourced verbatim from the document. Use answerSource MIXED or AI instead, or switch to OPEN_ENDED questions.',
    );
  }
}
