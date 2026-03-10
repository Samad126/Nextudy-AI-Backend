export interface FlashcardRaw {
  question: string;
  answer: string;
}

export interface GeneratedFlashcardsResponse {
  flashcards: FlashcardRaw[];
  error?: string;
}

export function buildFlashcardPrompt(
  count: number,
  difficulty?: string,
): string {
  const difficultyLine = difficulty
    ? `Difficulty level: ${difficulty}. Adjust the depth and specificity of questions accordingly.`
    : 'Use a balanced difficulty across the flashcards.';

  return `
You are an expert study assistant. Analyze the provided study material(s) and generate exactly ${count} flashcard(s).

${difficultyLine}

Requirements:
- Each flashcard must have a clear, focused QUESTION and a concise, accurate ANSWER
- Questions should test understanding, not just memorization
- Answers should be 1-3 sentences maximum
- Cover different concepts across the material — avoid repetition
- If the material does not contain enough content to generate ${count} flashcard(s), return: {"error":"INSUFFICIENT_CONTENT","flashcards":[]}

Return ONLY a valid JSON object in this exact format, with no markdown or extra text:
{
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}
`.trim();
}
