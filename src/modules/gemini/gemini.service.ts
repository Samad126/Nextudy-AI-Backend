import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private fileManager: GoogleAIFileManager;

  constructor(configService: ConfigService) {
    const apiKey = configService.getOrThrow<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
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
      await this.fileManager.deleteFile(`files/${match[1]}`);
    }
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

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts }],
    });

    return result.response.text();
  }

  parseJsonResponse<T>(rawText: string): T {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.error('Gemini returned invalid JSON', rawText.slice(0, 500));
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

  async generateChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    jsonInstruction: string,
    systemPrompt?: string,
  ): Promise<string> {
    const modelWithSystem = systemPrompt
      ? this.genAI.getGenerativeModel({
          model: 'gemini-3.1-flash-lite-preview',
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

    const result = await chat.sendMessage(userParts);
    return result.response.text();
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
