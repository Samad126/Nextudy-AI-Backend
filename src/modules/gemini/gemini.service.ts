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
      model: 'gemini-2.5-flash-lite',
    });
  }

  async generateResponse() {
    try {
      const prompt = `hi how are u`;
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
