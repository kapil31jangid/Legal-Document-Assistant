import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/lib/chunker';

describe('chunker utility', () => {
  it('should return empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('should return single chunk if text is smaller than max length', () => {
    const text = 'Short contract clause under limit.';
    const chunks = chunkText(text, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('should split text into multiple chunks when exceeding max length', () => {
    const paragraph1 = 'Paragraph 1: ' + 'A'.repeat(30);
    const paragraph2 = 'Paragraph 2: ' + 'B'.repeat(30);
    const fullText = `${paragraph1}\n\n${paragraph2}`;

    const chunks = chunkText(fullText, 50);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('Paragraph 1');
    expect(chunks[1]).toContain('Paragraph 2');
  });

  it('should respect sentence boundaries when paragraph exceeds max length', () => {
    const sentence1 = 'Sentence one is here.';
    const sentence2 = 'Sentence two is also here.';
    const longText = `${sentence1} ${sentence2}`;

    const chunks = chunkText(longText, 30);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe(sentence1);
    expect(chunks[1]).toBe(sentence2);
  });
});
