import { describe, it, expect } from 'vitest';
import { checkClauseRules } from '../src/lib/riskRules';

describe('riskRules pre-checker', () => {
  // ─── Financial Penalties ────────────────────────────────────────────────
  describe('financial penalties detection', () => {
    it('should flag financial penalties and late fees', () => {
      const text = 'Tenant shall pay a late fee penalty of $150 USD plus an interest rate of 1.5%.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasPenalties).toBe(true);
      expect(result.flaggedReasons.some(r => r.includes('financial penalty'))).toBe(true);
    });

    it('should flag liquidated damages clauses', () => {
      const text = 'In the event of breach, liquidated damages of $10,000 shall apply.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasPenalties).toBe(true);
    });

    it('should flag indemnification language', () => {
      const text = 'Lessee agrees to indemnify and hold harmless the Lessor from all claims, damages, and expenses.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
    });

    it('should flag clauses with large monetary amounts', () => {
      const text = 'The total liability shall not exceed $1,000,000 USD.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasPenalties).toBe(true);
    });
  });

  // ─── Deadlines & Notice Periods ─────────────────────────────────────────
  describe('deadline and notice period detection', () => {
    it('should flag 60-day termination notice', () => {
      const text = 'Either party may terminate by providing 60 days prior written notice.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasDeadlines).toBe(true);
      expect(result.flaggedReasons.some(r => r.includes('timeframe'))).toBe(true);
    });

    it('should flag 30-day notice periods', () => {
      const text = 'Tenant must provide 30 days written notice before vacating the premises.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasDeadlines).toBe(true);
    });

    it('should flag "within X days" language', () => {
      const text = 'Payment must be received within 14 days of the invoice date.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasDeadlines).toBe(true);
    });

    it('should flag "immediately" urgency language', () => {
      const text = 'The tenant must immediately vacate the premises upon breach of this agreement.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
    });
  });

  // ─── Strong Obligations ─────────────────────────────────────────────────
  describe('strong obligations detection', () => {
    it('should flag waiver of class-action rights', () => {
      const text = 'User explicitly waives any right to participate in a class-action lawsuit.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasStrongObligations).toBe(true);
    });

    it('should flag termination clauses', () => {
      const text = 'The landlord may terminate this agreement with immediate effect upon breach.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
    });

    it('should detect "shall" obligations', () => {
      const text = 'The lessee shall maintain the property in good condition at all times.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasStrongObligations).toBe(true);
    });

    it('should detect "must" obligations', () => {
      const text = 'Tenant must obtain written consent before making any alterations.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(true);
      expect(result.hasStrongObligations).toBe(true);
    });
  });

  // ─── Neutral / Clean Text ───────────────────────────────────────────────
  describe('neutral text (should not flag)', () => {
    it('should return unflagged for execution date language', () => {
      const text = 'This agreement is executed by the parties on the date written above.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(false);
      expect(result.flaggedReasons).toHaveLength(0);
    });

    it('should return unflagged for definitions section', () => {
      const text = '"Agreement" means this Residential Tenancy Agreement entered into between the parties.';
      const result = checkClauseRules(text);
      expect(result.isFlagged).toBe(false);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should handle empty string without throwing', () => {
      const result = checkClauseRules('');
      expect(result.isFlagged).toBe(false);
      expect(result.flaggedReasons).toHaveLength(0);
    });

    it('should handle very long text without throwing', () => {
      const longText = 'Normal contract text with no flags. '.repeat(500);
      expect(() => checkClauseRules(longText)).not.toThrow();
    });

    it('should handle special characters in text', () => {
      const text = 'The fee is €500 / £300 per annum. Penalty: ¥10,000.';
      const result = checkClauseRules(text);
      expect(result).toBeDefined();
    });

    it('should return all four result fields', () => {
      const result = checkClauseRules('some text');
      expect(result).toHaveProperty('isFlagged');
      expect(result).toHaveProperty('hasPenalties');
      expect(result).toHaveProperty('hasDeadlines');
      expect(result).toHaveProperty('hasStrongObligations');
      expect(result).toHaveProperty('flaggedReasons');
    });

    it('should return flaggedReasons as an array', () => {
      const result = checkClauseRules('This is a test clause.');
      expect(Array.isArray(result.flaggedReasons)).toBe(true);
    });
  });
});
