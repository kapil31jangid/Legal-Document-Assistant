import { describe, it, expect, vi } from 'vitest';
import {
  getClientIp,
  applySecurityHeaders,
  handleCors,
  checkRateLimit,
  validateRequestSize,
  applySecurityMiddleware,
} from '../api/_security';

// Helper to create mock VercelRequest & VercelResponse
function createMockReqRes(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) {
  const req: any = {
    method: options.method || 'POST',
    headers: options.headers || {},
    body: options.body || {},
    socket: { remoteAddress: '127.0.0.1' },
  };

  const resHeaders: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: any = null;
  let ended = false;

  const res: any = {
    setHeader: vi.fn((key: string, val: string) => {
      resHeaders[key.toLowerCase()] = val;
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((body: any) => {
      jsonBody = body;
      ended = true;
      return res;
    }),
    end: vi.fn(() => {
      ended = true;
      return res;
    }),
    _getHeaders: () => resHeaders,
    _getStatus: () => statusCode,
    _getJson: () => jsonBody,
    _isEnded: () => ended,
  };

  return { req, res };
}

describe('API Security Middleware Unit Tests', () => {
  describe('getClientIp', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const { req } = createMockReqRes({
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
      });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('falls back to socket remoteAddress when header is missing', () => {
      const { req } = createMockReqRes();
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('applySecurityHeaders', () => {
    it('sets all mandatory security headers on response', () => {
      const { res } = createMockReqRes();
      applySecurityHeaders(res);
      const headers = res._getHeaders();

      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['strict-transport-security']).toContain('max-age=31536000');
      expect(headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
      expect(headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('handleCors', () => {
    it('returns true and status 204 for OPTIONS preflight requests', () => {
      const { req, res } = createMockReqRes({ method: 'OPTIONS' });
      const handled = handleCors(req, res);

      expect(handled).toBe(true);
      expect(res._getStatus()).toBe(204);
      expect(res._isEnded()).toBe(true);
    });

    it('returns false for POST requests', () => {
      const { req, res } = createMockReqRes({ method: 'POST' });
      const handled = handleCors(req, res);

      expect(handled).toBe(false);
      expect(res._isEnded()).toBe(false);
    });
  });

  describe('validateRequestSize', () => {
    it('allows requests within size limit', () => {
      const { req, res } = createMockReqRes({
        headers: { 'content-length': '1024' },
      });
      const valid = validateRequestSize(req, res);
      expect(valid).toBe(true);
    });

    it('rejects requests exceeding 1MB limit with 413 status', () => {
      const { req, res } = createMockReqRes({
        headers: { 'content-length': '2097152' }, // 2MB
      });
      const valid = validateRequestSize(req, res);
      expect(valid).toBe(false);
      expect(res._getStatus()).toBe(413);
      expect(res._getJson()).toHaveProperty('error');
    });
  });

  describe('applySecurityMiddleware', () => {
    it('blocks OPTIONS requests after completing preflight', () => {
      const { req, res } = createMockReqRes({ method: 'OPTIONS' });
      const result = applySecurityMiddleware(req, res);
      expect(result.blocked).toBe(true);
    });

    it('allows valid POST requests', () => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.42' },
      });
      const result = applySecurityMiddleware(req, res);
      expect(result.blocked).toBe(false);
    });
  });

  describe('checkRateLimit edge cases', () => {
    it('tracks rate limits per client IP', () => {
      const { req: req1, res: res1 } = createMockReqRes({
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });
      const { req: req2, res: res2 } = createMockReqRes({
        headers: { 'x-forwarded-for': '10.0.0.2' },
      });

      expect(checkRateLimit(req1, res1)).toBe(true);
      expect(checkRateLimit(req2, res2)).toBe(true);
      expect(res1._getHeaders()['x-ratelimit-remaining']).toBe('29');
      expect(res2._getHeaders()['x-ratelimit-remaining']).toBe('29');
    });

    it('handles requests with empty headers gracefully', () => {
      const { req, res } = createMockReqRes({ headers: {} });
      expect(checkRateLimit(req, res)).toBe(true);
    });
  });
});
