import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurityMiddleware, isValidEmail, sanitizeString } from './_security';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { blocked } = applySecurityMiddleware(req, res);
  if (blocked) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const action = sanitizeString(body.action, 20);
    const email = sanitizeString(body.email, 254);
    const password = sanitizeString(body.password, 128);
    const name = sanitizeString(body.name, 100);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    // Reject obviously malicious inputs
    const suspiciousPattern = /<script|javascript:|on\w+=/i;
    if (suspiciousPattern.test(name) || suspiciousPattern.test(email)) {
      return res.status(400).json({ error: 'Invalid characters detected in input.' });
    }

    const safeUserName =
      name ||
      email
        .split('@')[0]
        .replace(/[^a-zA-Z\s]/g, ' ')
        .trim() ||
      'Legal User';

    return res.status(200).json({
      success: true,
      action: action === 'register' ? 'register' : 'login',
      token: `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user: {
        email: email.toLowerCase(),
        name: safeUserName.charAt(0).toUpperCase() + safeUserName.slice(1),
        role: 'Enterprise Member',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth:', error);
    return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
  }
}
