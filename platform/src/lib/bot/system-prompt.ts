import { readFileSync } from 'fs';
import { join } from 'path';

const FALLBACK_PROMPT = `Eres el asistente virtual de ventas de Codigo 10 (Cod10) por WhatsApp.
Responde en español, usa solo datos del catálogo proporcionado y mantén respuestas cortas.`;

/** Prompt editable en platform/config/gemini-system-prompt.txt */
export function loadSystemPrompt(): string {
  if (process.env.GEMINI_SYSTEM_PROMPT?.trim()) {
    return process.env.GEMINI_SYSTEM_PROMPT.trim();
  }

  try {
    const filePath = join(process.cwd(), 'config', 'gemini-system-prompt.txt');
    const content = readFileSync(filePath, 'utf8').trim();
    if (content) return content;
  } catch {
    /* archivo no encontrado en build — usar fallback */
  }

  return FALLBACK_PROMPT;
}
