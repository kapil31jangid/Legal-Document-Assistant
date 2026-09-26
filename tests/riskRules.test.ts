import { describe, it, expect } from 'vitest';
import { checkClauseRules } from '../src/lib/riskRules';

describe('riskRules pre-checker', () => {
  it('should flag financial penalties and fees', () => {
    const text = 'Tenant shall pay a late fee penalty of $150 USD plus an interest rate of 1.5%.';
    const result = checkClauseRules(text);
    expect(result.isFlagged).toBe(true);
    expect(result.hasPenalties).toBe(true);
    expect(result.flaggedReasons.some(r => r.includes('financial penalty'))).toBe(true);
  });

  it('should flag deadlines and notice periods', () => {
    const text = 'Either party may terminate by providing 60 days prior written notice.';
    const result = checkClauseRules(text);
    expect(result.isFlagged).toBe(true);
    expect(result.hasDeadlines).toBe(true);
    expect(result.flaggedReasons.some(r => r.includes('timeframe'))).toBe(true);
  });

  it('should flag mandatory obligation keywords like shall/must/waives right', () => {
    const text = 'User explicitly waives any right to participate in a class-action lawsuit.';
    const result = checkClauseRules(text);
    expect(result.isFlagged).toBe(true);
    expect(result.hasStrongObligations).toBe(true);
  });

  it('should return unflagged for standard neutral text', () => {
    const text = 'This agreement is executed by the parties on the date written above.';
    const result = checkClauseRules(text);
    expect(result.isFlagged).toBe(false);
    expect(result.flaggedReasons).toHaveLength(0);
  });
});
