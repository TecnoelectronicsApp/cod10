import { getBotRuntimeConfig } from './bot-config';
import { loadSystemPrompt } from './system-prompt';
import type { ChatMessage } from './conversation-flow';

const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateGeminiReply(
  catalogContext: string,
  userMessage: string,
  options?: {
    systemPrompt?: string;
    history?: ChatMessage[];
  },
): Promise<string> {
  const runtime = await getBotRuntimeConfig();
  const apiKey = runtime.geminiApiKey;

  if (!apiKey) {
    throw new Error('Gemini API key not configured (admin → Bot WhatsApp o GEMINI_API_KEY)');
  }

  const storeUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app';
  const basePrompt = options?.systemPrompt || runtime.systemPrompt || loadSystemPrompt();
  const prompt = `${basePrompt}\n\nTienda web: ${storeUrl}`;
  const fullSystem = `${prompt}\n\n${catalogContext}`;

  const models = [runtime.geminiModel, ...FALLBACK_MODELS].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );

  const contents = buildContents(userMessage, options?.history);
  let lastError = 'Gemini no respondió';

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystem }] },
          contents,
          generationConfig: { temperature: 0.85, maxOutputTokens: 1024 },
        }),
      });

      if (response.status === 429) {
        lastError = `Cuota Gemini (429) en ${model}`;
        await sleep(1500 * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        lastError = `Gemini ${model} HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
        break;
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
      lastError = `Gemini ${model} respuesta vacía`;
      break;
    }
  }

  throw new Error(lastError);
}

function buildContents(
  userMessage: string,
  history?: ChatMessage[],
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (history?.length) {
    for (const msg of history.slice(-10)) {
      contents.push({
        role: msg.fromCustomer ? 'user' : 'model',
        parts: [{ text: msg.body }],
      });
    }
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });
  return contents;
}
