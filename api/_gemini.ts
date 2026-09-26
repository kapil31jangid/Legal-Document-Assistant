import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

/**
 * Shared Gemini client wrapper for Vercel Serverless Functions.
 * Reads API key strictly from process.env.GEMINI_API_KEY.
 */

const BASE_DISCLAIMER_PROMPT = `
You are an expert AI Legal Assistant built for accessible, transparent document analysis.
CRITICAL SAFETY & COMPLIANCE DIRECTIVES:
1. You provide general legal information and document analysis ONLY, NOT legal advice.
2. NEVER state or assert that something is "legal", "illegal", "lawful", or "unlawful".
3. Always phrase analysis using neutral, descriptive terms such as: "this clause typically means...", "this provision creates an obligation to...", "you may wish to clarify...", or "standard commercial practice often...".
4. For any high-risk clause, explicitly advise consulting a qualified attorney or legal professional.
5. Base all analysis strictly on the text provided. Do NOT invent facts or hallucinate external terms not present in the input.
`;

export function getGeminiModel(modelName = 'gemini-1.5-flash', systemPrompt = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server configuration error: GEMINI_API_KEY environment variable is missing.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const fullSystemInstruction = `${BASE_DISCLAIMER_PROMPT}\n${systemPrompt}`;

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: fullSystemInstruction,
  });
}

export async function callGeminiJSON<T>(
  prompt: string,
  systemPrompt: string = '',
  modelName: string = 'gemini-1.5-flash'
): Promise<T> {
  const model = getGeminiModel(modelName, systemPrompt);

  const generationConfig: GenerationConfig = {
    responseMimeType: 'application/json',
    temperature: 0.2,
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const text = result.response.text();
    // Parse JSON safely
    const cleanedText = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (error: any) {
    console.error('Gemini JSON generation error:', error);
    throw new Error(`AI processing failed: ${error.message || 'Unknown error'}`);
  }
}

export async function callGeminiText(
  prompt: string,
  systemPrompt: string = '',
  modelName: string = 'gemini-1.5-flash'
): Promise<string> {
  const model = getGeminiModel(modelName, systemPrompt);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
      },
    });

    return result.response.text();
  } catch (error: any) {
    console.error('Gemini text generation error:', error);
    throw new Error(`AI generation failed: ${error.message || 'Unknown error'}`);
  }
}
