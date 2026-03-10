import { Module } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service.js';
import { FlashcardsController } from './flashcards.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
})
export class FlashcardsModule {}
