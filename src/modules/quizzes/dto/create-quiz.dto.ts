import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';

export class CreateQuizDto {
  @ApiProperty()
  @IsInt()
  workspaceId: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [Number], description: 'Array of question IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  questionIds: number[];
}
