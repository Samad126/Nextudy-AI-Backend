import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';
import { ResourcesModule } from '../resources/resources.module.js';
import { ChatRepository } from './chat.repository.js';
import { WorkbenchesModule } from '../workbenches/workbenches.module.js';

@Module({
  imports: [DatabaseModule, GeminiModule, ResourcesModule, WorkbenchesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
})
export class ChatModule {}
