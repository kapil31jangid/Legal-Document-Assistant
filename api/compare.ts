import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiJSON } from './_gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { documentA, documentB } = req.body || {};

    if (!documentA || !documentB) {
      return res.status(400).json({ error: 'Both "documentA" and "documentB" are required for comparison.' });
    }

    const systemPrompt = `You are a legal document comparison expert. 
Compare Document A (Original/Baseline) with Document B (New/Revised Version) and analyze the semantic differences at a clause level.
Focus on practical implications, shifted obligations, altered timelines, added liabilities, or removed protections.`;

    const userPrompt = `Compare the following two legal documents:

DOCUMENT A (Original):
"""
${documentA.slice(0, 10000)}
"""

DOCUMENT B (Revised):
"""
${documentB.slice(0, 10000)}
"""

Return JSON matching this exact structure:
{
  "summary": "High-level summary of major changes between Document A and Document B",
  "keyDifferences": [
    "Key difference bullet 1",
    "Key difference bullet 2"
  ],
  "diffs": [
    {
      "id": "diff-1",
      "status": "added | removed | modified | unchanged",
      "title": "Short title of clause or subject (e.g. Termination Notice Period)",
      "originalText": "Text in Document A (or empty string if added)",
      "compareText": "Text in Document B (or empty string if removed)",
      "practicalImplication": "Clear plain-language explanation of what this change means for the user in practice",
      "riskLevel": "HIGH | MEDIUM | LOW"
    }
  ]
}`;

    const result = await callGeminiJSON<any>(userPrompt, systemPrompt);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/compare:', error);
    return res.status(500).json({
      error: error.message || 'Failed to compare documents.',
    });
  }
}
