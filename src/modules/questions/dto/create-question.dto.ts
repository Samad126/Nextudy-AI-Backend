import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsNotEmpty,
  Min,
  Max,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum GenerationMode {
  USER_PROVIDED = 'USER_PROVIDED',
  AI_GENERATED = 'AI_GENERATED',
}

export enum GenerationScope {
  FIXED = 'FIXED',
  EXHAUSTIVE = 'EXHAUSTIVE',
}

// Generation-time enums — MIXED means "produce a mix", not stored in DB
export enum AnswerSchema {
  MCQ = 'MCQ',
  MIXED = 'MIXED',
  OPEN_ENDED = 'OPEN_ENDED',
}

export enum GenerationDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  MIXED = 'MIXED',
}

export enum AnswerSource {
  FILE = 'file',
  AI = 'ai',
  MIXED = 'mixed',
}

export enum AnswerLengthUnit {
  WORDS = 'words',
  PARAGRAPHS = 'paragraphs',
  PAGES = 'pages',
}

export class AnswerLengthDto {
  @ApiProperty({ enum: AnswerLengthUnit })
  @IsEnum(AnswerLengthUnit)
  unit: AnswerLengthUnit;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount: number;
}

export class CreateQuestionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  workbenchId: number;

  @ApiProperty({ enum: GenerationMode })
  @IsEnum(GenerationMode)
  generationMode: GenerationMode;

  @ApiProperty({ enum: AnswerSource })
  @IsEnum(AnswerSource)
  answerSource: AnswerSource;

  // ── USER_PROVIDED mode ────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Required when generationMode is USER_PROVIDED',
  })
  @ValidateIf(
    (o: CreateQuestionDto) => o.generationMode === GenerationMode.USER_PROVIDED,
  )
  @IsString()
  @IsNotEmpty()
  questions?: string;

  // ── AI_GENERATED mode ─────────────────────────────────────
  @ApiPropertyOptional({
    enum: AnswerSchema,
    description: 'Required when generationMode is AI_GENERATED',
  })
  @ValidateIf(
    (o: CreateQuestionDto) => o.generationMode === GenerationMode.AI_GENERATED,
  )
  @IsEnum(AnswerSchema)
  answerSchema?: AnswerSchema;

  @ApiPropertyOptional({
    enum: GenerationDifficulty,
    description: 'Required when generationMode is AI_GENERATED',
  })
  @ValidateIf(
    (o: CreateQuestionDto) => o.generationMode === GenerationMode.AI_GENERATED,
  )
  @IsEnum(GenerationDifficulty)
  difficulty?: GenerationDifficulty;

  @ApiPropertyOptional({
    enum: GenerationScope,
    description: 'Required when generationMode is AI_GENERATED',
  })
  @ValidateIf(
    (o: CreateQuestionDto) => o.generationMode === GenerationMode.AI_GENERATED,
  )
  @IsEnum(GenerationScope)
  generationScope?: GenerationScope;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    description: 'Required when generationScope is FIXED',
  })
  @ValidateIf(
    (o: CreateQuestionDto) =>
      o.generationMode === GenerationMode.AI_GENERATED &&
      o.generationScope === GenerationScope.FIXED,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;

  @ApiPropertyOptional({
    minimum: 50,
    default: 250,
    description:
      'Minimum word count the source material must have before generation proceeds. Defaults to 250 (≈1 page of handwritten text).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  minWords?: number;

  @ApiPropertyOptional({
    type: AnswerLengthDto,
    description:
      'Expected answer length for open-ended questions (e.g. 3 paragraphs, 450 words, 1 page). Only relevant when answerSchema is OPEN_ENDED or MIXED.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnswerLengthDto)
  answerLength?: AnswerLengthDto;
}
