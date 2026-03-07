import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

export enum AutoMode {
  COUNT = 'COUNT',
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
}

export class CreateQuestionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  workspaceId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  workbenchId: number;

  @ApiProperty({ enum: QuestionMode })
  @IsEnum(QuestionMode)
  mode: QuestionMode;

  @ApiProperty({ enum: AnswerSource })
  @IsEnum(AnswerSource)
  answerSource: AnswerSource;

  // ── MANUAL mode ──────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Required when mode is MANUAL' })
  @ValidateIf((o: CreateQuestionDto) => o.mode === QuestionMode.MANUAL)
  @IsString()
  @IsNotEmpty()
  questions?: string;

  // ── AUTO mode ─────────────────────────────────────────────
  @ApiPropertyOptional({
    enum: AnswerSchema,
    description: 'Required when mode is AUTO',
  })
  @ValidateIf((o: CreateQuestionDto) => o.mode === QuestionMode.AUTO)
  @IsEnum(AnswerSchema)
  answerSchema?: AnswerSchema;

  @ApiPropertyOptional({
    enum: GenerationDifficulty,
    description: 'Required when mode is AUTO',
  })
  @ValidateIf((o: CreateQuestionDto) => o.mode === QuestionMode.AUTO)
  @IsEnum(GenerationDifficulty)
  difficulty?: GenerationDifficulty;

  @ApiPropertyOptional({
    enum: AutoMode,
    description: 'Required when mode is AUTO',
  })
  @ValidateIf((o: CreateQuestionDto) => o.mode === QuestionMode.AUTO)
  @IsEnum(AutoMode)
  autoMode?: AutoMode;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    description: 'Required when autoMode is COUNT',
  })
  @ValidateIf(
    (o: CreateQuestionDto) =>
      o.mode === QuestionMode.AUTO && o.autoMode === AutoMode.COUNT,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;
}
