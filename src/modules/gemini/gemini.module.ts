import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service.js';
import { GEMINI_SERVICE } from './gemini.interface.js';
import { GEMINI_FILE_SERVICE } from './gemini-file.interface.js';

@Module({
  providers: [
    GeminiService,
    { provide: GEMINI_SERVICE, useExisting: GeminiService },
    { provide: GEMINI_FILE_SERVICE, useExisting: GeminiService },
  ],
  exports: [GeminiService, GEMINI_SERVICE, GEMINI_FILE_SERVICE],
})
export class GeminiModule {}
