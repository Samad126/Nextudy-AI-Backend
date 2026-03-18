import { Module } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service.js';
import { FlashcardsController } from './flashcards.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { ResourcesModule } from '../resources/resources.module.js';
import { FlashcardsRepository } from './flashcards.repository.js';

@Module({
  imports: [DatabaseModule, GeminiModule, ResourcesModule],
  controllers: [FlashcardsController],
  providers: [FlashcardsService, FlashcardsRepository],
})
export class FlashcardsModule {}
