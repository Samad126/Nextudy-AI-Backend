import { PartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto.js';

export class UpdateQuizDto extends PartialType(CreateQuizDto) {}
