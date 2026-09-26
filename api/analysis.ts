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
      return res.status(400).json({ error: 'Missing or empty "documentText" parameter.' });
    }

    if (documentText.length < 10) {
      return res.status(400).json({ error: 'Document text is too short to analyze.' });
    }

    const clauses = isSafeArray(rawClauses, 50)
      ? rawClauses.slice(0, 20).map((c: any) => ({
          id: sanitizeString(c?.id, 50),
          text: sanitizeString(c?.text, 2000),
          ruleCheck: c?.ruleCheck || {},
        }))
      : [];

    const systemPrompt = `You are an expert AI legal document analyst.
Perform a full document analysis on the provided legal text:
1. Extract executive key metadata (overview, parties, key dates, financial figures, core rights, core obligations, language).
2. Generate plain-language explanations for sections.
3. Classify clauses into Obligation/Risk/Right/Deadline/Neutral with LOW/MEDIUM/HIGH risk levels and clear reasons.`;

    const formattedClauses =
      clauses.length > 0
        ? clauses.map((c: any, i: number) => `Clause ${i + 1} (ID: ${c.id}): "${c.text}"`).join('\n\n')
        : '';

    const userPrompt = `Analyze the following document:

DOCUMENT TEXT:
"""
${documentText.slice(0, 15000)}
"""

${formattedClauses ? `CLAUSES TO CLASSIFY:\n${formattedClauses}` : ''}

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
      "originalText": "Clause or section text excerpt",
      "headline": "3-6 word summary headline",
      "simplifiedText": "Clear plain-language explanation of what this provision means in practice."
    }
  ],
  "classifications": [
    {
      "clauseId": "clause id matching input (e.g. clause-1)",
      "category": "Obligation | Risk | Right | Deadline | Neutral",
      "riskLevel": "HIGH | MEDIUM | LOW",
      "reason": "one-line plain English explanation of risk",
      "summary": "brief one-sentence summary"
    }
  ]
}`;

    const result = await callGeminiJSON<any>(userPrompt, systemPrompt);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/analysis:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process document analysis.',
    });
  }
}
