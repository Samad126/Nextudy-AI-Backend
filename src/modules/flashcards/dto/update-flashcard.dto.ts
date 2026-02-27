import { PartialType } from '@nestjs/swagger';
import { CreateFlashcardDto } from './create-flashcard.dto.js';

export class UpdateFlashcardDto extends PartialType(CreateFlashcardDto) {}
