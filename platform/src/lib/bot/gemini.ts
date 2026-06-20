import { getBotRuntimeConfig } from './bot-config';
import { loadSystemPrompt } from './system-prompt';

export async function generateGeminiReply(
  catalogContext: string,
  userMessage: string,
  systemPrompt?: string,
): Promise<string> {
  const runtime = await getBotRuntimeConfig();
  const apiKey = runtime.geminiApiKey;

  if (!apiKey) {
    throw new Error('Gemini API key not configured (admin → Bot WhatsApp o GEMINI_API_KEY)');
  }

  const model = runtime.geminiModel;
  const storeUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app';
  const basePrompt = systemPrompt || runtime.systemPrompt || loadSystemPrompt();
  const prompt = `${basePrompt}\n\nTienda web del cliente: ${storeUrl}`;
  const fullSystem = `${prompt}\n\n${catalogContext}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: fullSystem }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}
