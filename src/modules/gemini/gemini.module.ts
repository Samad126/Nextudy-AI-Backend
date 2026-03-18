import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service.js';
import { GEMINI_SERVICE } from './gemini.interface.js';

@Module({
  providers: [
    GeminiService,
    { provide: GEMINI_SERVICE, useExisting: GeminiService },
  ],
  exports: [GeminiService, GEMINI_SERVICE],
})
export class GeminiModule {}
