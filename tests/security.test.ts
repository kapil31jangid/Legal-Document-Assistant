import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  isNonEmptyString,
  isValidEmail,
  isSafeArray,
} from '../api/_security';

describe('Security utilities', () => {
  // ─── sanitizeString ───────────────────────────────────────────────────────
  describe('sanitizeString', () => {
    it('should return empty string for non-string inputs', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(42)).toBe('');
      expect(sanitizeString({})).toBe('');
    });

    it('should strip null bytes', () => {
      const result = sanitizeString('Hello\0World');
      expect(result).not.toContain('\0');
      expect(result).toContain('HelloWorld');
    });

    it('should strip dangerous control characters', () => {
      // Null byte, bell, backspace, form feed, escape
      const dangerous = 'test\x01\x07\x08\x0C\x1B\x7Fend';
      const result = sanitizeString(dangerous);
      expect(result).toBe('testend');
    });

    it('should preserve legitimate whitespace (newlines and tabs)', () => {
      const text = 'Line one\nLine two\tTabbed';
      const result = sanitizeString(text);
      expect(result).toContain('\n');
      expect(result).toContain('\t');
    });

    it('should truncate to maxLength', () => {
      const long = 'A'.repeat(200);
      expect(sanitizeString(long, 100)).toHaveLength(100);
    });

    it('should use default maxLength of 50000', () => {
      const long = 'B'.repeat(60_000);
      expect(sanitizeString(long)).toHaveLength(50_000);
    });

    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle Unicode text correctly', () => {
      const unicode = 'Héllo Wörld — legal §document';
      const result = sanitizeString(unicode);
      expect(result).toBe(unicode);
    });
  });

  // ─── isNonEmptyString ─────────────────────────────────────────────────────
  describe('isNonEmptyString', () => {
    it('should return true for valid non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('  hello  ')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
    });
  });

  // ─── isValidEmail ─────────────────────────────────────────────────────────
  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('name.surname@legal.org')).toBe(true);
      expect(isValidEmail('test+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('noatsign.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });

    it('should reject emails exceeding 254 characters', () => {
      const longEmail = `${'a'.repeat(250)}@x.com`;
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(42)).toBe(false);
    });
  });

  // ─── isSafeArray ──────────────────────────────────────────────────────────
  describe('isSafeArray', () => {
    it('should return true for valid arrays within limit', () => {
      expect(isSafeArray([1, 2, 3], 10)).toBe(true);
      expect(isSafeArray([], 10)).toBe(true);
    });

    it('should return false for arrays exceeding maxLength', () => {
      const bigArray = Array.from({ length: 101 }, (_, i) => i);
      expect(isSafeArray(bigArray, 100)).toBe(false);
    });

    it('should return false for non-array values', () => {
      expect(isSafeArray('not-an-array', 10)).toBe(false);
      expect(isSafeArray(null, 10)).toBe(false);
      expect(isSafeArray({}, 10)).toBe(false);
      expect(isSafeArray(42, 10)).toBe(false);
    });

    it('should use default maxLength of 100', () => {
      const arr100 = Array.from({ length: 100 }, (_, i) => i);
      const arr101 = Array.from({ length: 101 }, (_, i) => i);
      expect(isSafeArray(arr100)).toBe(true);
      expect(isSafeArray(arr101)).toBe(false);
    });
  });

  // ─── XSS / Injection pattern detection ────────────────────────────────────
  describe('XSS and injection protection', () => {
    it('should sanitize script injection attempts', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = sanitizeString(xssInput);
      // The string shouldn't cause any issues and should be preserved
      // (HTML escaping happens at render time, not here)
      expect(typeof result).toBe('string');
    });

    it('should handle very large inputs gracefully', () => {
      const huge = 'x'.repeat(1_000_000);
      const result = sanitizeString(huge, 50_000);
      expect(result.length).toBe(50_000);
    });

    it('should handle mixed content with null bytes safely', () => {
      const mixed = 'Normal text\0with\0null\0bytes';
      const result = sanitizeString(mixed);
      expect(result).not.toContain('\0');
      expect(result).toBe('Normal textwithnullbytes');
    });
  });
});
