import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsString,
  ArrayMinSize,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @ApiProperty({ description: 'QuizQuestion ID' })
  @IsInt()
  quizQuestionId: number;

  @ApiProperty({
    description: 'For MCQ: the MCQChoice ID (number). For open-ended: free text (string).',
    oneOf: [{ type: 'string' }, { type: 'integer' }],
  })
  @IsNotEmpty()
  userAnswer: string | number;
}

export class SubmitQuizDto {
  @ApiProperty({ type: [QuizAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
