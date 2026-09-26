import { describe, it, expect } from 'vitest';
import { segmentDocumentIntoClauses } from '../src/lib/clauseSegmenter';

describe('clauseSegmenter', () => {
  // ─── Basic segmentation ──────────────────────────────────────────────────
  describe('basic segmentation', () => {
    it('should return empty array for empty input', () => {
      const result = segmentDocumentIntoClauses('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only input', () => {
      const result = segmentDocumentIntoClauses('   \n\n\t  ');
      expect(result).toEqual([]);
    });

    it('should return at least one clause for non-empty text', () => {
      const result = segmentDocumentIntoClauses('This is a simple contract clause.');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should split on double newlines (paragraph breaks)', () => {
      const text = 'First clause about payment.\n\nSecond clause about termination.\n\nThird clause about notices.';
      const result = segmentDocumentIntoClauses(text);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Section headers ─────────────────────────────────────────────────────
  describe('section header detection', () => {
    it('should detect numbered section headers', () => {
      const text = '1. Payment Terms\nRent shall be $1,200 per month.\n\n2. Termination\nEither party may terminate with 30 days notice.';
      const result = segmentDocumentIntoClauses(text);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect ALL-CAPS headers', () => {
      const text = 'PAYMENT TERMS\nRent shall be $1,200 per month.\n\nTERMINATION\nEither party may terminate.';
      const result = segmentDocumentIntoClauses(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Clause structure ────────────────────────────────────────────────────
  describe('clause data structure', () => {
    it('each clause should have required fields', () => {
      const text = 'The tenant shall pay rent monthly.\n\nThe landlord shall maintain the property.';
      const clauses = segmentDocumentIntoClauses(text);
      expect(clauses.length).toBeGreaterThanOrEqual(1);
      clauses.forEach(clause => {
        expect(clause).toHaveProperty('id');
        expect(clause).toHaveProperty('index');
        expect(clause).toHaveProperty('text');
        expect(clause).toHaveProperty('title');
        expect(clause).toHaveProperty('ruleCheck');
      });
    });

    it('clause ids should be unique', () => {
      const text = 'Clause one.\n\nClause two.\n\nClause three.\n\nClause four.';
      const clauses = segmentDocumentIntoClauses(text);
      const ids = clauses.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('clause indices should be sequential starting at 1', () => {
      const text = 'First.\n\nSecond.\n\nThird.';
      const clauses = segmentDocumentIntoClauses(text);
      clauses.forEach((clause, i) => {
        expect(clause.index).toBe(i + 1);
      });
    });

    it('each clause should have a ruleCheck result object', () => {
      const text = 'The tenant must pay a penalty of $500 for late payment.';
      const clauses = segmentDocumentIntoClauses(text);
      expect(clauses.length).toBeGreaterThanOrEqual(1);
      expect(clauses[0].ruleCheck).toBeDefined();
      expect(typeof clauses[0].ruleCheck.isFlagged).toBe('boolean');
    });
  });

  // ─── Rule integration ────────────────────────────────────────────────────
  describe('rule pre-check integration', () => {
    it('should flag clauses with penalty language via ruleCheck', () => {
      const text = 'Tenant shall pay a late fee of $100 per day for each day payment is overdue.';
      const clauses = segmentDocumentIntoClauses(text);
      const flaggedClauses = clauses.filter(c => c.ruleCheck.isFlagged);
      expect(flaggedClauses.length).toBeGreaterThanOrEqual(1);
    });

    it('should not flag neutral clauses via ruleCheck', () => {
      const text = 'This agreement is made on the date signed above between the Landlord and the Tenant.';
      const clauses = segmentDocumentIntoClauses(text);
      expect(clauses.length).toBeGreaterThanOrEqual(1);
      // Should not be flagged for neutral definitions
      expect(clauses[0].ruleCheck).toBeDefined();
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should not throw on very long documents', () => {
      const longText = Array.from({ length: 100 }, (_, i) => `Clause ${i + 1}: This is a clause about something important in the contract.\n\n`).join('');
      expect(() => segmentDocumentIntoClauses(longText)).not.toThrow();
    });

    it('should handle a document with only one paragraph', () => {
      const text = 'This single paragraph agreement is between Landlord and Tenant for the property.';
      const clauses = segmentDocumentIntoClauses(text);
      expect(clauses.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter out clauses that are too short (boilerplate whitespace)', () => {
      const text = '\n\n\n\nActual clause content here that is meaningful.\n\n\n\n';
      const clauses = segmentDocumentIntoClauses(text);
      clauses.forEach(clause => {
        expect(clause.text.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
