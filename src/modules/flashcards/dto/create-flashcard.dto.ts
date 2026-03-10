import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Difficulty } from '../../../../generated/prisma/client.js';

export class CreateFlashcardDto {
  @ApiProperty()
  @IsInt()
  workspaceId: number;

  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({
    description: 'Number of flashcards to generate (default: 5)',
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @ApiProperty({ type: [Number], description: 'Resource IDs to generate from' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  resourceIds: number[];
}
