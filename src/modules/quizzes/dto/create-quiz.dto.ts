import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export class CreateQuizDto {
  @ApiProperty()
  @IsInt()
  workspaceId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: [Number], description: 'Array of question IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  questionIds: number[];
}
