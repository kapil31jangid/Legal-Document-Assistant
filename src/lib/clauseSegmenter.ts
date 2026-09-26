import { Clause } from './types';
import { checkClauseRules } from './riskRules';

/**
 * Client-side utility function to segment legal documents into clauses.
 */
export function segmentDocumentIntoClauses(documentText: string): Clause[] {
  if (!documentText || !documentText.trim()) {
    return [];
  }

  const normalized = documentText.replace(/\r\n/g, '\n').trim();

  // Regex patterns to identify section headers or list numbers
  const sectionHeaderRegex = /^(?:SECTION\s+\d+|ARTICLE\s+[IVXLCDM\d]+|\d+\.\d+|\d+\.|\([a-z0-9]+\))\s+/i;

  // Split text by double newlines or lines starting with explicit numbered sections
  const rawBlocks = normalized.split(/\n{2,}/);
  const clauses: Clause[] = [];
  let clauseIndex = 1;

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check if block is too long (contains multiple numbered items on single newlines)
    const lines = trimmed.split('\n');
    let currentTextBuffer: string[] = [];
    let currentTitle = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const matchesHeader = sectionHeaderRegex.test(line);

      if (matchesHeader && currentTextBuffer.length > 0) {
        // Save preceding buffer as a clause
        const text = currentTextBuffer.join('\n').trim();
        if (text) {
          const ruleCheck = checkClauseRules(text);
          const title = currentTitle || extractTitle(text, clauseIndex);
          clauses.push({
            id: `clause-${clauseIndex}`,
            index: clauseIndex,
            title,
            text,
            ruleCheck,
          });
          clauseIndex++;
        }
        currentTextBuffer = [line];
        currentTitle = line.length < 60 ? line : line.substring(0, 50) + '...';
      } else {
        currentTextBuffer.push(line);
        if (!currentTitle && line.length < 60 && sectionHeaderRegex.test(line)) {
          currentTitle = line;
        }
      }
    }

    if (currentTextBuffer.length > 0) {
      const text = currentTextBuffer.join('\n').trim();
      if (text) {
        const ruleCheck = checkClauseRules(text);
        const title = currentTitle || extractTitle(text, clauseIndex);
        clauses.push({
          id: `clause-${clauseIndex}`,
          index: clauseIndex,
          title,
          text,
          ruleCheck,
        });
        clauseIndex++;
      }
    }
  }

  return clauses;
}

function extractTitle(text: string, index: number): string {
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= 60 && !firstLine.endsWith('.')) {
    return firstLine;
  }
  // Try taking first 6-8 words
  const words = firstLine.split(/\s+/).slice(0, 7).join(' ');
  return words ? `Clause ${index}: ${words}...` : `Clause ${index}`;
}
