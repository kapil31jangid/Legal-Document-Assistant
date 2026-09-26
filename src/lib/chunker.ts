/**
 * Chunker utility for splitting large legal texts into manageable chunks for Gemini API calls.
 */

export const DEFAULT_MAX_CHUNK_LENGTH = 5000;

/**
 * Splits text into chunks respecting paragraph and sentence boundaries.
 */
export function chunkText(text: string, maxChunkLength: number = DEFAULT_MAX_CHUNK_LENGTH): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  const trimmed = text.trim();
  if (trimmed.length <= maxChunkLength) {
    return [trimmed];
  }

  const paragraphs = trimmed.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const pTrimmed = paragraph.trim();
    if (!pTrimmed) continue;

    const candidate = currentChunk ? `${currentChunk}\n\n${pTrimmed}` : pTrimmed;

    if (candidate.length <= maxChunkLength) {
      currentChunk = candidate;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      if (pTrimmed.length <= maxChunkLength) {
        currentChunk = pTrimmed;
      } else {
        // Paragraph exceeds limit, split by sentences
        const sentences = pTrimmed.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          const sTrimmed = sentence.trim();
          if (!sTrimmed) continue;

          const sCandidate = currentChunk ? `${currentChunk} ${sTrimmed}` : sTrimmed;

          if (sCandidate.length <= maxChunkLength) {
            currentChunk = sCandidate;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }

            if (sTrimmed.length <= maxChunkLength) {
              currentChunk = sTrimmed;
            } else {
              // Hard slice if single sentence is gigantic
              for (let i = 0; i < sTrimmed.length; i += maxChunkLength) {
                const sub = sTrimmed.slice(i, i + maxChunkLength);
                if (i + maxChunkLength < sTrimmed.length) {
                  chunks.push(sub);
                } else {
                  currentChunk = sub;
                }
              }
            }
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
