import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiJSON } from './_gemini';
import { applySecurityMiddleware, sanitizeString, isSafeArray, isNonEmptyString } from './_security';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { blocked } = applySecurityMiddleware(req, res);
  if (blocked) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const documentText = sanitizeString(body.documentText, 50_000);
    const rawClauses = body.clauses;

    if (!isNonEmptyString(documentText)) {
      return res.status(400).json({ error: 'Missing "documentText" parameter.' });
    }

    const clauses = isSafeArray(rawClauses, 100)
      ? rawClauses.map((c: any) => ({
          classification: c?.classification || null,
          riskLevel: sanitizeString(c?.riskLevel, 10),
          title: sanitizeString(c?.title, 200),
          text: sanitizeString(c?.text, 500),
        }))
      : [];

    const systemPrompt = `You are an actionable legal audit assistant. 
Synthesize the provided legal document and its flagged clauses into actionable output for the user:
1. Executive Plain-Text Summary
2. Next Steps Checklist (prioritized tasks: HIGH, MEDIUM, LOW)
3. Specific Questions to Ask a Lawyer before signing or agreeing.`;

    const clausesContext =
      clauses.length > 0
        ? `FLAGGED CLAUSES:\n` +
          clauses
            .map(
              (c: any) =>
                `- [Risk: ${c.classification?.riskLevel || c.riskLevel || 'Flagged'}] ${c.title || c.text?.slice(0, 100)}`
            )
            .join('\n')
        : '';

    const userPrompt = `Analyze this legal document and generate actionable guidance:

${clausesContext}

DOCUMENT TEXT:
"""
${documentText.slice(0, 12000)}
"""

Return JSON matching this exact structure:
{
  "summary": "Clear, concise executive summary of the document purpose, key obligations, and overall risk posture.",
  "nextSteps": [
    {
      "task": "Actionable task description (e.g. Verify 30-day notice requirement date in calendar)",
      "priority": "HIGH | MEDIUM | LOW",
      "relatedClause": "Optional clause reference"
    }
  ],
  "lawyerQuestions": [
    {
      "question": "Specific question to ask an attorney (e.g., Can we cap the uncapped indemnification clause in Section 8?)",
      "context": "Context or reason why this question is critical based on document text"
    }
  ]
}`;

    const result = await callGeminiJSON<any>(userPrompt, systemPrompt);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/checklist:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate actionable checklist.',
    });
  }
}
