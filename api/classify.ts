import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiJSON } from './_gemini';

interface InputClause {
  id: string;
  text: string;
  ruleCheck?: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { clauses } = req.body || {};

    if (!Array.isArray(clauses) || clauses.length === 0) {
      return res.status(400).json({ error: 'Parameter "clauses" must be a non-empty array.' });
    }

    // Limit batch size to 25 clauses per call for speed and accuracy
    const targetClauses: InputClause[] = clauses.slice(0, 25);

    const systemPrompt = `You are a legal clause classifier and risk analyst.
Classify each provided legal clause into one of the following categories:
- "Obligation" (duties, mandatory requirements)
- "Risk" (potential liabilities, penalties, indemnities, loss of rights)
- "Right" (entitlements, permissions granted to user)
- "Deadline" (time-sensitive dates, notice periods)
- "Neutral" (boilerplate definitions, background)

Assign a risk level: "HIGH", "MEDIUM", or "LOW".
- HIGH: Severe financial penalties, waiver of legal recourse, unilateral termination, unlimited liability, immediate forfeiture.
- MEDIUM: Strict deadlines, automatic renewal, restrictive covenants, standard fee escalation.
- LOW: Standard terms, clear balanced rights, routine notice requirements, neutral definitions.

Provide a clear one-line "reason" explaining the risk level, and a one-sentence "summary".
Never assert whether a clause is "legal" or "illegal". Use phrases like "this clause typically means..." or "you may want to clarify...".`;

    const formattedInput = targetClauses
      .map(
        (c, idx) =>
          `Clause ${idx + 1} (ID: ${c.id}):\nRules Flagged: ${
            c.ruleCheck?.flaggedReasons?.join('; ') || 'None'
          }\nText: "${c.text}"`
      )
      .join('\n\n---\n\n');

    const userPrompt = `Classify the following clauses:\n\n${formattedInput}\n\nReturn JSON matching this exact structure:
{
  "classifications": [
    {
      "clauseId": "string (matching input ID)",
      "category": "Obligation | Risk | Right | Deadline | Neutral",
      "riskLevel": "HIGH | MEDIUM | LOW",
      "reason": "one-line plain English explanation of risk",
      "summary": "brief one-sentence summary"
    }
  ]
}`;

    const result = await callGeminiJSON<{ classifications: any[] }>(userPrompt, systemPrompt);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/classify:', error);
    return res.status(500).json({
      error: error.message || 'Failed to classify clauses.',
    });
  }
}
