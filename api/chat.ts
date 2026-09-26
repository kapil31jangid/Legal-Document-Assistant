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
    const message = sanitizeString(body.message, 2_000);
    const rawHistory = body.history;

    if (!isNonEmptyString(documentText)) {
      return res.status(400).json({ error: 'Both "documentText" and "message" are required.' });
    }
    if (!isNonEmptyString(message)) {
      return res.status(400).json({ error: '"message" is required and must be a non-empty string.' });
    }

    // Sanitize conversation history
    const history = isSafeArray(rawHistory, 50)
      ? rawHistory
          .slice(-20)
          .map((h: any) => ({
            role: h?.role === 'assistant' ? 'assistant' : 'user',
            content: sanitizeString(h?.content, 1_000),
          }))
          .filter((h: any) => h.content.length > 0)
      : [];

    const systemPrompt = `You are a strictly grounded AI legal document Q&A assistant with direct clause citation capabilities.
CRITICAL MANDATE:
1. Answer questions ONLY using explicit facts contained within the provided document text.
2. If the user asks a question whose answer is NOT directly stated or inferable from the document text, return isGrounded=false and state explicitly:
   "I cannot find information about this in the provided document. Please consult the document directly or speak with a legal professional."
3. Include specific clause titles or section headings as citations in your answer text (e.g. "[Section 2: Rent and Payment Terms]").
4. Also extract exact citation objects with "clauseTitle" and "excerpt" matching where the evidence was found in the text.
5. Do NOT invent facts or provide ungrounded external advice.`;

    const formattedHistory = history
      .map((h: any) => `${h.role === 'assistant' ? 'Assistant' : 'User'}: ${h.content}`)
      .join('\n');

    const userPrompt = `DOCUMENT TEXT:
"""
${documentText.slice(0, 15000)}
"""

CONVERSATION HISTORY:
${formattedHistory}

USER QUESTION:
${message}

Return JSON matching this exact structure:
{
  "answer": "Clear, grounded answer text referencing specific section headings in brackets like [Clause 2: Rent Payment Terms].",
  "isGrounded": true,
  "citations": [
    {
      "clauseTitle": "Clause or Section Heading referenced",
      "excerpt": "Short 1-sentence quote or key phrase from document confirming this answer"
    }
  ]
}`;

    const result = await callGeminiJSON<{
      answer: string;
      isGrounded: boolean;
      citations?: Array<{ clauseTitle: string; excerpt: string }>;
    }>(userPrompt, systemPrompt);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process chat query.',
    });
  }
}
