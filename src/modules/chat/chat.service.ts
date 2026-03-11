import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { anyMemberFilter } from '../../common/utils/workspace-filters.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { MessageRole } from '../../../generated/prisma/client.js';
import {
  buildChatJsonInstruction,
  type ChatAIResponse,
} from './chat.prompts.js';

const MODEL_ID = 'gemini-3.1-flash-lite-preview';

const SYSTEM_PROMPT = `You are Nextudy AI, an intelligent study assistant embedded in a learning platform.

Your role is to help students understand, analyse, and learn from their uploaded study materials (PDFs, documents, images, and text files).

Guidelines:
- Base your answers primarily on the provided documents. If the answer is in the documents, cite or reference the relevant content.
- If the question cannot be answered from the documents, you may use your general knowledge but clearly state that you are doing so.
- Be concise and clear. Avoid unnecessary filler or repetition.
- When explaining concepts, use simple language and examples where helpful.
- If asked to generate flashcards or quizzes, let the user know they can create them directly from the Flashcards and Quizzes sections in the app using their uploaded resources.
- Never make up facts. If you are unsure, say so.
- Maintain a professional, encouraging, and student-friendly tone.
- Always respond in the JSON format specified in the user's message.`;

@Injectable()
export class ChatService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiService,
  ) {}

  private async getWorkbenchForUser(userId: number, workbenchId: number) {
    const workbench = await this.db.workbench.findFirst({
      where: { id: workbenchId, workspace: anyMemberFilter(userId) },
    });
    if (!workbench) throw new NotFoundException('Workbench not found');
    return workbench;
  }

  async create(userId: number, dto: CreateChatDto) {
    await this.getWorkbenchForUser(userId, dto.workbenchId);

    return this.db.chatHistory.create({
      data: {
        workbenchId: dto.workbenchId,
        title: dto.title,
        model_id: MODEL_ID,
        system_prompt: SYSTEM_PROMPT,
      },
    });
  }

  async findAll(userId: number, workbenchId: number) {
    await this.getWorkbenchForUser(userId, workbenchId);
    return this.db.chatHistory.findMany({
      where: { workbenchId },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findOne(userId: number, chatId: number) {
    const chat = await this.db.chatHistory.findFirst({
      where: { id: chatId, workbench: { workspace: anyMemberFilter(userId) } },
      include: { messages: { orderBy: { created_at: 'asc' } } },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async remove(userId: number, chatId: number) {
    const chat = await this.db.chatHistory.findFirst({
      where: { id: chatId, workbench: { workspace: anyMemberFilter(userId) } },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    await this.db.chatHistory.delete({ where: { id: chatId } });
    return { message: 'Chat deleted successfully' };
  }

  async sendMessage(userId: number, chatId: number, dto: SendMessageDto) {
    const chat = await this.db.chatHistory.findFirst({
      where: { id: chatId, workbench: { workspace: anyMemberFilter(userId) } },
      include: {
        workbench: {
          include: { resources: { include: { resource: true } } },
        },
        messages: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    const workbenchResources = chat.workbench.resources.map(
      (wr) => wr.resource,
    );

    const files = workbenchResources
      .filter((r) => r.store_id && r.mime_type)
      .map((r) => ({
        uri: r.store_id as string,
        mimeType: r.mime_type as string,
      }));

    const resourceMeta = workbenchResources.map((r) => ({
      id: r.id,
      fileName: r.name,
    }));

    const jsonInstruction = buildChatJsonInstruction(resourceMeta);

    const history = chat.messages
      .filter((m) => m.role !== MessageRole.system)
      .map((m) => ({
        role:
          m.role === MessageRole.user ? ('user' as const) : ('model' as const),
        content: m.content,
      }));

    await this.db.message.create({
      data: {
        chat_history_id: chatId,
        role: MessageRole.user,
        content: dto.content,
      },
    });

    const rawText = await this.gemini.generateChatResponse(
      dto.content,
      history,
      files,
      jsonInstruction,
      SYSTEM_PROMPT,
    );

    const parsed = this.gemini.parseJsonResponse<ChatAIResponse>(rawText);

    const assistantMessage = await this.db.message.create({
      data: {
        chat_history_id: chatId,
        role: MessageRole.assistant,
        content: parsed.answer,
        model_id: MODEL_ID,
        sources: parsed.sources as object[],
      },
    });

    await this.db.chatHistory.update({
      where: { id: chatId },
      data: { updated_at: new Date() },
    });

    return assistantMessage;
  }
}
