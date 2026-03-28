import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty } from '../../../../generated/prisma/client.js';

export class UpdateMcqChoiceDto {
  @ApiPropertyOptional({
    description: 'Choice ID to update (omit to create new)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  choice_text?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9)
  choice_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;
}

export class UpdateGradingKeywordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Min(0)
  @Max(1)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  explanation?: string;

  // ── MCQ-specific ────────────────────────────────────────────
  @ApiPropertyOptional({
    type: [UpdateMcqChoiceDto],
    description:
      'For MCQ questions: update/replace choices. Choices with an id are updated, without id are created.',
  })
  @ValidateIf((o: UpdateQuestionDto) => o.mcqChoices !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMcqChoiceDto)
  mcqChoices?: UpdateMcqChoiceDto[];

  // ── Open-ended-specific ─────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  sample_answer?: string;

  @ApiPropertyOptional({
    type: [UpdateGradingKeywordDto],
    description: 'For open-ended questions: update/replace grading keywords.',
  })
  @ValidateIf((o: UpdateQuestionDto) => o.gradingKeywords !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGradingKeywordDto)
  gradingKeywords?: UpdateGradingKeywordDto[];
}
