import {
  GoogleGenerativeAI,
  GenerativeModel,
  type Part,
} from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IGeminiService,
  GeminiResourceInput,
  GeminiParts,
} from './gemini.interface.js';
import type { IGeminiFileService } from './gemini-file.interface.js';

@Injectable()
export class GeminiService implements IGeminiService, IGeminiFileService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private fileManager: GoogleAIFileManager;
  readonly modelName: string;

  constructor(configService: ConfigService) {
    const apiKey = configService.getOrThrow<string>('GEMINI_API_KEY');
    this.modelName =
      configService.get<string>('GEMINI_MODEL') ??
      'gemini-3.1-flash-lite-preview';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
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

  private buildParts(
    files: { uri: string; mimeType: string }[],
    htmlTexts: string[],
    prompt: string,
  ): Part[] {
    return [
      ...files.map((f) => ({
        fileData: { fileUri: f.uri, mimeType: f.mimeType },
      })),
      ...htmlTexts.map((html) => ({
        text: `<document_html>\nThe following is the raw HTML source of a study document. HTML tags are part of the content and must be preserved exactly as-is when quoting snippets.\n${html}\n</document_html>`,
      })),
      { text: prompt },
    ];
  }

  async generateWithFiles(
    prompt: string,
    files: { uri: string; mimeType: string }[],
    htmlTexts: string[] = [],
  ): Promise<string> {
    const parts = this.buildParts(files, htmlTexts, prompt);

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts }],
        // generationConfig: {
        //   maxOutputTokens: 16384, // Increase output limit for large documents
        //   temperature: 0.1, // Lower temperature for more accurate extraction
        // },
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

  toGeminiFiles(resources: GeminiResourceInput[]): GeminiParts {
    if (resources.length === 0) {
      throw new BadRequestException(
        'None of the selected resources have been uploaded to Gemini yet.',
      );
    }
    const files: { uri: string; mimeType: string }[] = [];
    const htmlTexts: string[] = [];
    for (const r of resources) {
      if (r.type === 'IMAGE' || !r.content) {
        files.push({ uri: r.store_id, mimeType: r.mime_type });
      } else {
        htmlTexts.push(r.content);
      }
    }
    return { files, htmlTexts };
  }

  async *streamChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    systemPrompt?: string,
    htmlTexts: string[] = [],
  ): AsyncGenerator<string> {
    const modelWithSystem = systemPrompt
      ? this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: systemPrompt,
        })
      : this.model;

    const geminiHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = modelWithSystem.startChat({ history: geminiHistory });

    const userParts = this.buildParts(files, htmlTexts, userMessage);

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

  async extractTextFromFile(uri: string): Promise<string> {
    const prompt =
      'You are a high-fidelity document text extractor. EXTRACT EVERY SINGLE WORD, TABLE, DATA POINT, and SECTION from this file. DO NOT SUMMARIZE. DO NOT OMIT ANY TEXT. Format it as semantic HTML (using tags like <h1>–<h6>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <table>, <tr>, <th>, <td>, <br>). Output ONLY the raw HTML content with no wrapping <html>, <head>, or <body> tags and no markdown. If the document is long, you must continue until the very end. EVERY DETAIL IS CRITICAL.';
    return this.generateWithFiles(prompt, [
      { uri, mimeType: 'application/pdf' },
    ]);
  }

  async generateChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    jsonInstruction: string,
    systemPrompt?: string,
    htmlTexts: string[] = [],
  ): Promise<string> {
    const modelWithSystem = systemPrompt
      ? this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: systemPrompt,
        })
      : this.model;

    const geminiHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = modelWithSystem.startChat({ history: geminiHistory });

    const userParts = this.buildParts(
      files,
      htmlTexts,
      `${userMessage}\n\n${jsonInstruction}`,
    );

    try {
      const result = await chat.sendMessage(userParts);
      return result.response.text();
    } catch (error) {
      this.handleGeminiError(error);
    }
  }
}
