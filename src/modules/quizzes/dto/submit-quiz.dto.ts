import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  ArrayMinSize,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @ApiProperty({ description: 'QuizQuestion ID' })
  @IsInt()
  quizQuestionId: number;

  @ApiProperty({
    description:
      'For MCQ: the MCQChoice ID (number). For open-ended: free text (string).',
    oneOf: [{ type: 'string' }, { type: 'integer' }],
  })
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
