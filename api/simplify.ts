import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiJSON } from './_gemini';
import { applySecurityMiddleware, sanitizeString, isNonEmptyString } from './_security';
import { SimplifyResponsePayload } from '../src/lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { blocked } = applySecurityMiddleware(req, res);
  if (blocked) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const text = sanitizeString(body.text, 50_000);

    if (!isNonEmptyString(text)) {
      return res.status(400).json({ error: 'Missing or empty "text" parameter.' });
    }

    if (text.length < 10) {
      return res.status(400).json({ error: 'Document text is too short to simplify.' });
    }

    const systemPrompt = `You are an expert AI legal analyst and plain-language simplifier.
Extract high-level key metadata and break the document down into section-by-section plain English explanations.`;

    const userPrompt = `Analyze the following legal text:

DOCUMENT TEXT:
"""
${text.slice(0, 15000)}
"""

Return JSON matching this exact structure:
{
  "keyMetadata": {
    "overview": "2-3 sentence executive summary explaining document purpose and primary scope.",
    "parties": ["Array of parties identified, e.g. 'Landlord (Apex Management)', 'Tenant (John Doe)'"],
    "importantDates": ["Key dates, timelines, notice periods, or effective dates"],
    "financialAmounts": ["All monetary figures, rent, fees, security deposits, liability caps, interest rates"],
    "keyRights": ["Core permissions or rights granted to the user"],
    "keyObligations": ["Core mandatory duties expected of the user"],
    "languageDetected": "Primary language of document (e.g. 'English')"
  },
  "sections": [
    {
      "sectionIndex": 1,
      "originalText": "Exact clause text excerpt",
      "headline": "3-6 word summary headline",
      "simplifiedText": "Clear plain-language explanation of what this provision means in practice."
    }
  ]
}`;

    const result = await callGeminiJSON<SimplifyResponsePayload>(userPrompt, systemPrompt);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/simplify:', error);
    return res.status(500).json({
      error: error.message || 'Failed to simplify document.',
    });
  }
}
