export const GEMINI_SERVICE = Symbol('IGeminiService');

export interface GeminiResourceInput {
  store_id: string;
  mime_type: string;
  type?: string;
  content?: string | null;
}

export interface GeminiParts {
  files: { uri: string; mimeType: string }[];
  htmlTexts: string[];
}

export interface IGeminiService {
  generateWithFiles(
    prompt: string,
    files: { uri: string; mimeType: string }[],
    htmlTexts?: string[],
  ): Promise<string>;
  parseJsonResponse<T>(rawText: string): T;
  toGeminiFiles(resources: GeminiResourceInput[]): GeminiParts;
  generateChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    jsonInstruction: string,
    systemPrompt?: string,
    htmlTexts?: string[],
  ): Promise<string>;
  streamChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    systemPrompt?: string,
    htmlTexts?: string[],
  ): AsyncGenerator<string>;
  extractTextFromFile(uri: string): Promise<string>;
}
