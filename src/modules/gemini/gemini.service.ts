import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IGeminiService } from './gemini.interface.js';
import type { IGeminiFileService } from './gemini-file.interface.js';

@Injectable()
export class GeminiService implements IGeminiService, IGeminiFileService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private fileManager: GoogleAIFileManager;

  constructor(configService: ConfigService) {
    const apiKey = configService.getOrThrow<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
    this.model = this.genAI.getGenerativeModel({
      // model: 'gemini-2.5-flash',
      model: 'gemini-2.5-flash',
    });
  }

  async uploadFile(
    filePath: string,
    mimeType: string,
    displayName: string,
  ): Promise<string> {
    const result = await this.fileManager.uploadFile(filePath, {
      mimeType,
      displayName,
    });
    return result.file.uri;
  }

  async deleteFile(storeId: string): Promise<void> {
    // storeId is the full URI like "https://generativelanguage.googleapis.com/v1beta/files/..."
    // extract the file name (files/<id>) from the URI
    const match = storeId.match(/\/files\/([^/]+)$/);
    if (match) {
      try {
        await this.fileManager.deleteFile(`files/${match[1]}`);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status !== 403 && status !== 404) throw err;
      }
    }
  }

  private handleGeminiError(error: unknown): never {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status: number }).status
        : null;

    if (status === 429) {
      throw new HttpException(
        'AI service is rate limited. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 503) {
      throw new HttpException(
        'AI service is temporarily unavailable. Please try again shortly.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (status === 500) {
      throw new HttpException(
        'AI service encountered an internal error. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.error('Gemini API error', error);
    throw new HttpException(
      'AI service request failed. Please try again.',
      HttpStatus.BAD_GATEWAY,
    );
  }

  async generateWithFiles(
    prompt: string,
    files: { uri: string; mimeType: string }[],
  ): Promise<string> {
    const parts = [
      ...files.map((f) => ({
        fileData: { fileUri: f.uri, mimeType: f.mimeType },
      })),
      { text: prompt },
    ];

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts }],
      });
      return result.response.text();
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  parseJsonResponse<T>(rawText: string): T {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.error('Gemini returned invalid JSON', rawText);
      throw new BadRequestException(
        'AI response could not be processed. Please try again.',
      );
    }
  }

  toGeminiFiles(
    resources: Array<{ store_id: string; mime_type: string }>,
  ): { uri: string; mimeType: string }[] {
    if (resources.length === 0) {
      throw new BadRequestException(
        'None of the selected resources have been uploaded to Gemini yet.',
      );
    }
    return resources.map((r) => ({ uri: r.store_id, mimeType: r.mime_type }));
  }

  async *streamChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    systemPrompt?: string,
  ): AsyncGenerator<string> {
    const modelWithSystem = systemPrompt
      ? this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemPrompt,
        })
      : this.model;

    const geminiHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = modelWithSystem.startChat({ history: geminiHistory });

    const userParts = [
      ...files.map((f) => ({
        fileData: { fileUri: f.uri, mimeType: f.mimeType },
      })),
      { text: userMessage },
    ];

    try {
      const result = await chat.sendMessageStream(userParts);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  async generateChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    jsonInstruction: string,
    systemPrompt?: string,
  ): Promise<string> {
    const modelWithSystem = systemPrompt
      ? this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemPrompt,
        })
      : this.model;

    const geminiHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = modelWithSystem.startChat({ history: geminiHistory });

    const userParts = [
      ...files.map((f) => ({
        fileData: { fileUri: f.uri, mimeType: f.mimeType },
      })),
      { text: `${userMessage}\n\n${jsonInstruction}` },
    ];

    try {
      const result = await chat.sendMessage(userParts);
      return result.response.text();
    } catch (error) {
      this.handleGeminiError(error);
    }
  }
}

/* 
    status: 429,
  statusText: 'Too Many Requests',
  errorDetails: [
    {
      '@type': 'type.googleapis.com/google.rpc.Help',
      links: [
        {
          description: 'Learn more about Gemini API quotas',
          url: 'https://ai.google.dev/gemini-api/docs/rate-limits'
        }
      ]
    },
    {
      '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
      violations: [
        {
          quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
          quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
          quotaDimensions: {
            model: 'gemini-3.1-flash-lite',
            location: 'global'
          },
          quotaValue: '15'
        }
      ]
    },
    {
      '@type': 'type.googleapis.com/google.rpc.RetryInfo',
      retryDelay: '11s'
    }
  ]
}
*/
