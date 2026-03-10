import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { Difficulty } from '../../../../generated/prisma/client.js';

export class CreateFlashcardDto {
  @ApiProperty()
  @IsInt()
  workspaceId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiProperty({ type: [Number], description: 'Resource IDs to attach' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  resourceIds: number[];
}
