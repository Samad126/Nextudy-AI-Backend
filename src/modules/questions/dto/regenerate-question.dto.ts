import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  Difficulty,
  QuestionType,
} from '../../../../generated/prisma/client.js';
import { AnswerSource } from './create-question.dto.js';

export class RegenerateQuestionDto {
  @ApiProperty({
    description:
      'If true, generate a completely new question (new title, topic, etc.). If false, keep the original question title and only regenerate answers/choices.',
  })
  @IsBoolean()
  regenerateFromScratch: boolean;

  @ApiProperty({ enum: AnswerSource })
  @IsEnum(AnswerSource)
  answerSource: AnswerSource;

  @ApiProperty({
    enum: QuestionType,
    description: 'Question type — only mcq or open_ended.',
  })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiPropertyOptional({
    enum: Difficulty,
    description: 'Desired difficulty: EASY, MEDIUM, or HARD.',
  })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
