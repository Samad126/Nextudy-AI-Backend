import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  ArrayMinSize,
  ValidateNested,
  IsDateString,
  IsDefined,
} from 'class-validator';

export class QuizAnswerDto {
  @ApiProperty({ description: 'QuizQuestion ID' })
  @IsInt()
  quizQuestionId: number;

  @ApiProperty({
    description:
      'For MCQ: the MCQChoice ID (number). For open-ended: free text (string).',
    oneOf: [{ type: 'string' }, { type: 'integer' }],
  })
  @IsDefined()
  userAnswer: string | number;
}

export class SubmitQuizDto {
  @ApiProperty({
    description: 'ISO 8601 date string when the quiz was started',
  })
  @IsDateString()
  startedAt: string;

  @ApiProperty({
    description: 'ISO 8601 date string when the quiz was completed',
  })
  @IsDateString()
  completedAt: string;

  @ApiProperty({ type: [QuizAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
