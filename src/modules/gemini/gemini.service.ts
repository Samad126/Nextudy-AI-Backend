import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
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
      throw new BadRequestException(
        `Gemini returned invalid JSON. Raw response: ${rawText.slice(0, 300)}`,
      );
    }
  }

  async generateResponse() {
    try {
      const prompt = `azərbaycanca bilirsən?`;
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const response = result.response;
      const text = response.text();
      console.log(response);
      const messageResponse = {
        message: text,
      };

      return messageResponse;
    } catch (e) {
      console.log(e);
      throw e;
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
