import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service.js';
import { QuizzesController } from './quizzes.controller.js';

@Module({
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}
