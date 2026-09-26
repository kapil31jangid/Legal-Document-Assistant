import { describe, it, expect } from 'vitest';
import { segmentDocumentIntoClauses } from '../src/lib/clauseSegmenter';

describe('clauseSegmenter', () => {
  it('should return empty array for empty or whitespace string', () => {
    expect(segmentDocumentIntoClauses('')).toEqual([]);
    expect(segmentDocumentIntoClauses('   \n  ')).toEqual([]);
  });

  it('should segment numbered clauses accurately', () => {
    const text = `1. RENT PAYMENT
Tenant shall pay $1000 monthly.

2. TERMINATION
Either party may terminate with 30 days notice.`;

    const clauses = segmentDocumentIntoClauses(text);
    expect(clauses.length).toBe(2);
    expect(clauses[0].index).toBe(1);
    expect(clauses[0].title).toContain('1. RENT PAYMENT');
    expect(clauses[1].index).toBe(2);
    expect(clauses[1].title).toContain('2. TERMINATION');
  });

  it('should parse multi-line sections with headers like SECTION 1', () => {
    const text = `SECTION 1. DEFINITIONS
In this agreement, terms are defined as follows.

SECTION 2. INDEMNIFICATION
Tenant agrees to indemnify landlord for all damages.`;

    const clauses = segmentDocumentIntoClauses(text);
    expect(clauses.length).toBe(2);
    expect(clauses[0].text).toContain('In this agreement');
    expect(clauses[1].ruleCheck.isFlagged).toBe(true);
    expect(clauses[1].ruleCheck.hasPenalties).toBe(true);
  });
});
