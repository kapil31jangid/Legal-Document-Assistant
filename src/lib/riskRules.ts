import { RulePreCheckResult } from './types';

/**
 * Fast, deterministic client-side regex rules to pre-check legal clauses for potential risks,
 * deadlines, penalties, obligations, and termination clauses before sending to Gemini API.
 */

const PATTERNS = {
  penalties: /(penalty|penalties|liquidated damages|fine|fines|fee|fees|interest|late payment|\$|\bUSD\b|percent|%|forfeiture|reimburse|indemnification|indemnify)/i,
  deadlines: /(\b\d+\s+(days?|months?|years?|hours?)\b|notice period|prior notice|deadline|expiration|expire|within\s+\d+|on or before|due date|time is of the essence)/i,
  obligations: /(shall|must|is required to|agrees to|unconditional|sole discretion|waives?|waiver|irrevocable|binding|covenants)/i,
  terminationLiability: /(terminate|termination|cancel|cancellation|limitation of liability|hold harmless|arbitration|governing law|breach|default|remedy|remedies|eviction|forfeit)/i,
};

export function checkClauseRules(text: string): RulePreCheckResult {
  const hasPenalties = PATTERNS.penalties.test(text);
  const hasDeadlines = PATTERNS.deadlines.test(text);
  const hasStrongObligations = PATTERNS.obligations.test(text);
  const hasTerminationOrLiability = PATTERNS.terminationLiability.test(text);

  const flaggedReasons: string[] = [];

  if (hasPenalties) {
    flaggedReasons.push('Contains financial penalty, fee, or indemnification language');
  }
  if (hasDeadlines) {
    flaggedReasons.push('Specifies exact timeframe, deadline, or notice period');
  }
  if (hasStrongObligations) {
    flaggedReasons.push('Uses strict mandatory obligation language (shall/must/waives right)');
  }
  if (hasTerminationOrLiability) {
    flaggedReasons.push('Contains termination, liability limitation, or breach conditions');
  }

  const isFlagged = flaggedReasons.length > 0;

  return {
    isFlagged,
    hasPenalties,
    hasDeadlines,
    hasStrongObligations,
    hasTerminationOrLiability,
    flaggedReasons,
  };
}
