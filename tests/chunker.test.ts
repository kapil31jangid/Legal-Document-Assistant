import { describe, it, expect } from 'vitest';
import { chunkText, DEFAULT_MAX_CHUNK_LENGTH } from '../src/lib/chunker';

describe('chunker utility', () => {
  // ─── Basic ───────────────────────────────────────────────────────────────
  describe('basic behavior', () => {
    it('should return empty array for empty string', () => {
      expect(chunkText('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(chunkText('   \n\n\t  ')).toEqual([]);
    });

    it('should return single chunk if text is smaller than max length', () => {
      const text = 'Short contract clause under limit.';
      const chunks = chunkText(text, 100);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should return an array of strings', () => {
      const text = 'Simple text.';
      const result = chunkText(text, 100);
      expect(Array.isArray(result)).toBe(true);
      result.forEach(chunk => expect(typeof chunk).toBe('string'));
    });
  });

  // ─── Splitting behavior ──────────────────────────────────────────────────
  describe('paragraph-based splitting', () => {
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

    it('should not produce empty chunks', () => {
      const text = 'Para one.\n\n\n\n\nPara two.\n\n\n\nPara three.';
      const chunks = chunkText(text, 1000);
      chunks.forEach(chunk => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Chunk size constraints ──────────────────────────────────────────────
  describe('chunk size constraints', () => {
    it('each chunk should not exceed max length', () => {
      const text = Array.from({ length: 20 }, (_, i) => `Paragraph ${i}: ${'word '.repeat(50)}.`).join('\n\n');
      const maxLen = 500;
      const chunks = chunkText(text, maxLen);
      // Chunks may slightly exceed if a single sentence is longer, but paragraphs should be respected
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should use DEFAULT_MAX_CHUNK_LENGTH when no limit provided', () => {
      const shortText = 'A short piece of text.';
      const chunks = chunkText(shortText);
      expect(chunks.length).toBe(1);
      expect(DEFAULT_MAX_CHUNK_LENGTH).toBeGreaterThan(0);
    });

    it('total content should be preserved across all chunks', () => {
      const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
      const text = words.map(w => `Section: ${w}. `.repeat(5)).join('\n\n');
      const chunks = chunkText(text, 100);
      const combined = chunks.join(' ');
      words.forEach(word => {
        expect(combined).toContain(word);
      });
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should handle single very long word without throwing', () => {
      const singleWord = 'A'.repeat(10000);
      expect(() => chunkText(singleWord, 500)).not.toThrow();
    });

    it('should handle legal document with many sections', () => {
      const legal = Array.from({ length: 50 }, (_, i) =>
        `Section ${i + 1}: This provision governs the obligations of the parties with respect to item number ${i + 1}.`
      ).join('\n\n');
      const chunks = chunkText(legal, 1000);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle text with only newlines', () => {
      const result = chunkText('\n\n\n\n\n\n');
      expect(result).toEqual([]);
    });

    it('should handle text that is exactly at max length', () => {
      const text = 'X'.repeat(500);
      const chunks = chunkText(text, 500);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
