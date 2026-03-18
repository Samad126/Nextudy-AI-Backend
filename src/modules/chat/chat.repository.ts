import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { anyMemberFilter } from '../../common/utils/workspace-filters.js';
import { MessageRole } from '../../../generated/prisma/client.js';
@Injectable()
export class ChatRepository {
  constructor(private readonly db: DatabaseService) {}

  createChat(data: {
    workbenchId: number;
    title: string;
    model_id: string;
    system_prompt: string;
  }) {
    return this.db.chatHistory.create({ data });
  }

  findAllChats(workbenchId: number) {
    return this.db.chatHistory.findMany({
      where: { workbenchId },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  findOneChat(chatId: number, userId: number) {
    return this.db.chatHistory.findFirst({
      where: { id: chatId, workbench: { workspace: anyMemberFilter(userId) } },
      include: { messages: { orderBy: { created_at: 'asc' } } },
    });
  }

  findOneChatWithWorkbench(chatId: number, userId: number) {
    return this.db.chatHistory.findFirst({
      where: { id: chatId, workbench: { workspace: anyMemberFilter(userId) } },
      include: {
        workbench: true,
        messages: { orderBy: { created_at: 'asc' } },
      },
    });
  }

  findOneChatBase(chatId: number, userId: number) {
    return this.db.chatHistory.findFirst({
      where: { id: chatId, workbench: { workspace: anyMemberFilter(userId) } },
    });
  }

  deleteChat(chatId: number) {
    return this.db.chatHistory.delete({ where: { id: chatId } });
  }

  createMessage(data: {
    chat_history_id: number;
    role: MessageRole;
    content: string;
    model_id?: string;
    sources?: object[];
  }) {
    return this.db.message.create({ data });
  }

  touchChat(chatId: number) {
    return this.db.chatHistory.update({
      where: { id: chatId },
      data: { updated_at: new Date() },
    });
  }

  deleteMessagesFrom(chatId: number, fromMessageId: number) {
    return this.db.message.deleteMany({
      where: { chat_history_id: chatId, id: { gte: fromMessageId } },
    });
  }
}
