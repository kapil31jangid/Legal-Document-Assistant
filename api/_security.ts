import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared Security Middleware for Vercel Serverless Functions.
 * Implements: rate limiting, CORS, security headers, input sanitization,
 * request size validation, and XSS/injection protection.
 */

// In-memory rate limiting (per cold-start instance)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;  // 30 requests/minute per IP

// Max request body size: 1 MB
const MAX_BODY_BYTES = 1024 * 1024;

// Allowed origins (set ALLOWED_ORIGIN env var in production)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

/**
 * Extract the real client IP from request headers.
 */
export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket as any)?.remoteAddress || 'unknown';
}

/**
 * Apply all required security response headers.
 */
export function applySecurityHeaders(res: VercelResponse): void {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent embedding in iframes (clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');
  // Legacy XSS filter for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable unnecessary browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // Force HTTPS (1 year)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Content Security Policy for API responses
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'"
  );
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  // Prevent caching of sensitive API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
}

/**
 * Handle CORS preflight OPTIONS requests.
 * Returns true if the request was handled (caller should return early).
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  applySecurityHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Enforce per-IP rate limiting.
 * Returns false and sends 429 if limit exceeded.
 */
export function checkRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQUESTS - 1));
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.windowStart)) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({
      error: 'Too many requests. Please wait before retrying.',
      retryAfter,
    });
    return false;
  }

  record.count++;
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQUESTS - record.count));
  return true;
}

/**
 * Validate request Content-Length is within allowed limit.
 * Returns false and sends 413 if too large.
 */
export function validateRequestSize(req: VercelRequest, res: VercelResponse): boolean {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (!isNaN(contentLength) && contentLength > MAX_BODY_BYTES) {
    res.status(413).json({
      error: `Request body too large. Maximum allowed size is ${MAX_BODY_BYTES / 1024}KB.`,
    });
    return false;
  }
  return true;
}

/**
 * Sanitize a string input: removes null bytes, control characters,
 * and truncates to the given max length.
 */
export function sanitizeString(input: unknown, maxLength = 50_000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')                              // remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove non-printable control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate that a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate that a value is a valid email address.
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) && value.length <= 254;
}

/**
 * Validate that a value is an array with a maximum allowed length.
 */
export function isSafeArray(value: unknown, maxLength = 100): value is unknown[] {
  return Array.isArray(value) && value.length <= maxLength;
}

/**
 * Combined security middleware — call at the top of every handler.
 * Returns { blocked: true } if the request has been rejected (caller must return).
 */
export function applySecurityMiddleware(
  req: VercelRequest,
  res: VercelResponse
): { blocked: boolean } {
  // Handle CORS preflight
  if (handleCors(req, res)) {
    return { blocked: true };
  }

  // Validate request body size
  if (!validateRequestSize(req, res)) {
    return { blocked: true };
  }

  // Rate limit
  if (!checkRateLimit(req, res)) {
    return { blocked: true };
  }

  return { blocked: false };
}
