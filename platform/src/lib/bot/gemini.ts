import { getBotRuntimeConfig } from './bot-config';
import type { ChatMessage } from './conversation-flow';
import { buildMandatorySystemInstruction, resolveConfiguredSystemPrompt } from './system-prompt';

const FALLBACK_MODELS = ['gemini-2.0-flash-lite', 'gemini-1.5-flash'];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateGeminiReply(
  catalogContext: string,
  userMessage: string,
  options?: {
    history?: ChatMessage[];
    customerBlock?: string;
  },
): Promise<string> {
  const runtime = await getBotRuntimeConfig();
  const apiKey = runtime.geminiApiKey;

  if (!apiKey) {
    throw new Error('Gemini API key not configured (admin → Bot WhatsApp o GEMINI_API_KEY)');
  }

  const { prompt: configuredPrompt, source } = resolveConfiguredSystemPrompt(runtime.systemPrompt);
  if (source === 'default') {
    console.warn('[bot/gemini] systemPrompt no configurado en admin — usando prompt mínimo');
  }

  const storeUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app').replace(/\/$/, '');
  const customerBlock = options?.customerBlock?.trim() || '';
  const fullSystem = buildMandatorySystemInstruction(
    configuredPrompt,
    storeUrl,
    catalogContext,
    customerBlock,
  );

  const models = [runtime.geminiModel, ...FALLBACK_MODELS].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );

  const contents = buildContents(userMessage, options?.history);
  let lastError = 'Gemini no respondió';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: fullSystem }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
          }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          lastError = `Cuota Gemini (429) en ${model}`;
          await sleep(800 * (attempt + 1));
          continue;
        }

        if (!response.ok) {
          lastError = `Gemini ${model} HTTP ${response.status}`;
          break;
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
        lastError = `Gemini ${model} respuesta vacía`;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Error Gemini';
        if (attempt === 0) await sleep(500);
      } finally {
        clearTimeout(timer);
      }
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
    for (const msg of history.slice(-8)) {
      contents.push({
        role: msg.fromCustomer ? 'user' : 'model',
        parts: [{ text: msg.body }],
      });
    }
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });
  return contents;
}
