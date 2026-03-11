export interface SourceCitation {
  resourceId: number;
  fileName: string;
  page: number | null;
  snippet: string;
}

export interface ChatAIResponse {
  answer: string;
  sources: SourceCitation[];
}

export function buildChatJsonInstruction(
  resourceMeta: { id: number; fileName: string }[],
): string {
  const resourceList =
    resourceMeta.length > 0
      ? resourceMeta
          .map((r) => `  - id: ${r.id}, fileName: "${r.fileName}"`)
          .join('\n')
      : '  (none)';

  return `
IMPORTANT — You must respond with ONLY a valid JSON object, no markdown, no code fences, no extra text.

Available source documents:
${resourceList}

Response format:
{
  "answer": "<your response as plain text>",
  "sources": [
    {
      "resourceId": <id from the list above>,
      "fileName": "<fileName from the list above>",
      "page": <page number as integer, or null if unknown>,
      "snippet": "<exact verbatim text excerpt from the document that supports your answer>"
    }
  ]
}

Rules for sources:
- Include a source entry for every document passage that informed your answer.
- "snippet" MUST be the exact verbatim text from the document — do not paraphrase. The frontend uses it to highlight the passage in the PDF.
- If your answer draws on general knowledge and not the documents, return "sources": [].
- If you reference the same document multiple times, include a separate entry for each passage.
`.trim();
}
