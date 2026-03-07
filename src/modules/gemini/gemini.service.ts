import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY!;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
    });
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
