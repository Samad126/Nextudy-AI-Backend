export const GEMINI_SERVICE = Symbol('IGeminiService');

export interface IGeminiService {
  generateWithFiles(
    prompt: string,
    files: { uri: string; mimeType: string }[],
  ): Promise<string>;
  parseJsonResponse<T>(rawText: string): T;
  toGeminiFiles(
    resources: Array<{ store_id: string; mime_type: string }>,
  ): { uri: string; mimeType: string }[];
  generateChatResponse(
    userMessage: string,
    history: { role: 'user' | 'model'; content: string }[],
    files: { uri: string; mimeType: string }[],
    jsonInstruction: string,
    systemPrompt?: string,
  ): Promise<string>;
}
