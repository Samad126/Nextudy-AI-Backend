export const GEMINI_FILE_SERVICE = Symbol('IGeminiFileService');

export interface IGeminiFileService {
  uploadFile(
    filePath: string,
    mimeType: string,
    displayName: string,
  ): Promise<string>;
  deleteFile(storeId: string): Promise<void>;
}
