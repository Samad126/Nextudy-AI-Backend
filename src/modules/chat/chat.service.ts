import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { IGeminiService } from '../gemini/gemini.interface.js';
import { GEMINI_SERVICE } from '../gemini/gemini.interface.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { EditMessageDto } from './dto/edit-message.dto.js';

import { MessageRole } from '../../../generated/prisma/client.js';
import {
  buildChatJsonInstruction,
  SYSTEM_PROMPT,
  type ChatAIResponse,
} from './chat.prompts.js';
import { ChatRepository } from './chat.repository.js';
import { WorkbenchesRepository } from '../workbenches/workbenches.repository.js';

const MODEL_ID = 'gemini-3.1-flash-lite-preview';

type WorkbenchResource = {
  id: number;
  name: string;
  store_id: string;
  mime_type: string;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly repo: ChatRepository,
    private readonly workbenchesRepo: WorkbenchesRepository,
    @Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService,
  ) {}

  private async getWorkbenchForUser(userId: number, workbenchId: number) {
    const workbench = await this.workbenchesRepo.findOneAsMember(
      workbenchId,
      userId,
    );
    if (!workbench) throw new NotFoundException('Workbench not found');
    return workbench;
  }

  private async _callGemini(
    content: string,
    history: { role: 'user' | 'model'; content: string }[],
    resources: WorkbenchResource[],
  ) {
    const files = this.gemini.toGeminiFiles(resources);

    const resourceMeta = resources.map((r) => ({ id: r.id, fileName: r.name }));
    const jsonInstruction = buildChatJsonInstruction(resourceMeta);

    const rawText = await this.gemini.generateChatResponse(
      content,
      history,
      files,
      jsonInstruction,
      SYSTEM_PROMPT,
    );

    return this.gemini.parseJsonResponse<ChatAIResponse>(rawText);
  }

  async create(userId: number, dto: CreateChatDto) {
    await this.getWorkbenchForUser(userId, dto.workbenchId);

    const chat = await this.repo.createChat({
      workbenchId: dto.workbenchId,
      title: dto.title,
      model_id: MODEL_ID,
      system_prompt: SYSTEM_PROMPT,
    });

    this.logger.log(`Chat created for workbench ${dto.workbenchId}`);
    return chat;
  }

  async findAll(userId: number, workbenchId: number) {
    await this.getWorkbenchForUser(userId, workbenchId);
    return this.repo.findAllChats(workbenchId);
  }

  async findOne(userId: number, chatId: number) {
    const chat = await this.repo.findOneChat(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async remove(userId: number, chatId: number) {
    const chat = await this.repo.findOneChatBase(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');

    await this.repo.deleteChat(chatId);
    this.logger.log(`Chat ${chatId} deleted`);
    return { message: 'Chat deleted successfully' };
  }

  private async _sendMessage(
    chatId: number,
    content: string,
    workbenchId: number,
    existingHistory: { role: 'user' | 'model'; content: string }[] = [],
  ) {
    const workbenchResources =
      await this.workbenchesRepo.findResources(workbenchId);
    const resources = workbenchResources.map((wr) => wr.resource);

    const userMsg = await this.repo.createMessage({
      chat_history_id: chatId,
      role: MessageRole.user,
      content,
    });

    const parsed = await this._callGemini(content, existingHistory, resources);

    const assistantMsg = await this.repo.createMessage({
      chat_history_id: chatId,
      role: MessageRole.assistant,
      content: parsed.answer,
      model_id: MODEL_ID,
      sources: parsed.sources as object[],
    });

    await this.repo.touchChat(chatId);

    return [userMsg, assistantMsg];
  }

  private async _streamMessage(
    chatId: number,
    content: string,
    workbenchId: number,
    history: { role: 'user' | 'model'; content: string }[],
    onChunk: (chunk: string) => void,
  ) {
    const workbenchResources =
      await this.workbenchesRepo.findResources(workbenchId);
    const resources = workbenchResources.map((wr) => wr.resource);
    const files = this.gemini.toGeminiFiles(resources);

    const resourceMeta = resources.map((r) => ({ id: r.id, fileName: r.name }));
    const jsonInstruction = buildChatJsonInstruction(resourceMeta);
    const contentWithInstruction = `${content}\n\n${jsonInstruction}`;

    const userMsg = await this.repo.createMessage({
      chat_history_id: chatId,
      role: MessageRole.user,
      content,
    });

    let fullText = '';
    let answerStart = -1;
    let emittedRawLength = 0;
    const ANSWER_MARKER = '"answer": "';

    for await (const chunk of this.gemini.streamChatResponse(
      contentWithInstruction,
      history,
      files,
      SYSTEM_PROMPT,
    )) {
      fullText += chunk;

      if (answerStart === -1) {
        const idx = fullText.indexOf(ANSWER_MARKER);
        if (idx !== -1) answerStart = idx + ANSWER_MARKER.length;
      }

      if (answerStart !== -1) {
        let end = fullText.length;
        for (let i = answerStart + emittedRawLength; i < fullText.length; i++) {
          if (fullText[i] === '"' && fullText[i - 1] !== '\\') {
            end = i;
            break;
          }
        }
        const rawChunk = fullText.slice(answerStart + emittedRawLength, end);
        if (rawChunk) {
          emittedRawLength += rawChunk.length;
          onChunk(
            rawChunk
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/\\t/g, '\t'),
          );
        }
      }
    }

    const parsed = this.gemini.parseJsonResponse<ChatAIResponse>(fullText);

    const assistantMsg = await this.repo.createMessage({
      chat_history_id: chatId,
      role: MessageRole.assistant,
      content: parsed.answer,
      model_id: MODEL_ID,
      sources: parsed.sources as object[],
    });

    await this.repo.touchChat(chatId);
    return [userMsg, assistantMsg] as const;
  }

  async streamSendMessage(
    userId: number,
    chatId: number,
    dto: SendMessageDto,
    onChunk: (chunk: string) => void,
  ) {
    const chat = await this.repo.findOneChatWithWorkbench(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');

    const history = chat.messages
      .filter((m) => m.role !== MessageRole.system)
      .map((m) => ({
        role:
          m.role === MessageRole.user ? ('user' as const) : ('model' as const),
        content: m.content,
      }));

    const [, assistantMsg] = await this._streamMessage(
      chatId,
      dto.content,
      chat.workbench.id,
      history,
      onChunk,
    );

    return assistantMsg;
  }

  async streamEditMessage(
    userId: number,
    chatId: number,
    messageId: number,
    dto: EditMessageDto,
    onChunk: (chunk: string) => void,
  ) {
    const chat = await this.repo.findOneChatWithWorkbench(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');

    const target = chat.messages.find((m) => m.id === messageId);
    if (!target) throw new NotFoundException('Message not found');
    if (target.role !== MessageRole.user) {
      throw new BadRequestException('Only user messages can be edited');
    }

    const historyBefore = chat.messages
      .filter((m) => m.id < messageId && m.role !== MessageRole.system)
      .map((m) => ({
        role:
          m.role === MessageRole.user ? ('user' as const) : ('model' as const),
        content: m.content,
      }));

    await this.repo.deleteMessagesFrom(chatId, messageId);

    const [, assistantMsg] = await this._streamMessage(
      chatId,
      dto.content,
      chat.workbench.id,
      historyBefore,
      onChunk,
    );

    return assistantMsg;
  }

  async sendMessage(userId: number, chatId: number, dto: SendMessageDto) {
    const chat = await this.repo.findOneChatWithWorkbench(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');

    const history = chat.messages
      .filter((m) => m.role !== MessageRole.system)
      .map((m) => ({
        role:
          m.role === MessageRole.user ? ('user' as const) : ('model' as const),
        content: m.content,
      }));

    const [, assistantMsg] = await this._sendMessage(
      chatId,
      dto.content,
      chat.workbench.id,
      history,
    );

    return assistantMsg;
  }

  async editMessage(
    userId: number,
    chatId: number,
    messageId: number,
    dto: EditMessageDto,
  ) {
    const chat = await this.repo.findOneChatWithWorkbench(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');

    const target = chat.messages.find((m) => m.id === messageId);
    if (!target) throw new NotFoundException('Message not found');
    if (target.role !== MessageRole.user) {
      throw new BadRequestException('Only user messages can be edited');
    }

    const historyBefore = chat.messages
      .filter((m) => m.id < messageId && m.role !== MessageRole.system)
      .map((m) => ({
        role:
          m.role === MessageRole.user ? ('user' as const) : ('model' as const),
        content: m.content,
      }));

    await this.repo.deleteMessagesFrom(chatId, messageId);

    const [, assistantMsg] = await this._sendMessage(
      chatId,
      dto.content,
      chat.workbench.id,
      historyBefore,
    );

    return assistantMsg;
  }
}
