import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { action, email, password, name } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const userName = name || email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Legal User';

    // Stateless authentication session response
    return res.status(200).json({
      success: true,
      action: action === 'register' ? 'register' : 'login',
      token: `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user: {
        email: email.toLowerCase(),
        name: userName.charAt(0).toUpperCase() + userName.slice(1),
        role: 'Enterprise Member',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth:', error);
    return res.status(500).json({ error: error.message || 'Authentication failed.' });
  }
}
