import { readFileSync } from 'fs';
import { join } from 'path';
import type { WhatsappBotConfig } from './bot-config';

const FALLBACK_PROMPT = `Eres el asistente virtual de ventas de Codigo 10 (Cod10) por WhatsApp.
Responde en español, usa solo datos del catálogo proporcionado y mantén respuestas cortas.
NO envíes el link del menú salvo que el cliente lo pida explícitamente.`;

/** Prompt editable en platform/config/gemini-system-prompt.txt (solo si admin no tiene uno) */
export function loadSystemPrompt(): string {
  if (process.env.GEMINI_SYSTEM_PROMPT?.trim()) {
    return process.env.GEMINI_SYSTEM_PROMPT.trim();
  }

  try {
    const filePath = join(process.cwd(), 'config', 'gemini-system-prompt.txt');
    const content = readFileSync(filePath, 'utf8').trim();
    if (content) return content;
  } catch {
    /* archivo no encontrado en build */
  }

  return FALLBACK_PROMPT;
}

/**
 * Prompt de admin obligatorio. Si no está en Cloudinary, usa env o archivo local.
 * Siempre se envuelve como reglas estrictas en Gemini.
 */
export function resolveConfiguredSystemPrompt(
  cloudPrompt: WhatsappBotConfig['systemPrompt'] | string | undefined,
): { prompt: string; source: 'admin' | 'env' | 'file' | 'default' } {
  const fromAdmin = cloudPrompt?.trim();
  if (fromAdmin) return { prompt: fromAdmin, source: 'admin' };

  const fromEnv = process.env.GEMINI_SYSTEM_PROMPT?.trim();
  if (fromEnv) return { prompt: fromEnv, source: 'env' };

  const fromFile = loadSystemPrompt();
  if (fromFile && fromFile !== FALLBACK_PROMPT) {
    return { prompt: fromFile, source: 'file' };
  }

  return { prompt: fromFile || FALLBACK_PROMPT, source: 'default' };
}

export function buildMandatorySystemInstruction(
  configuredPrompt: string,
  storeUrl: string,
  catalogContext: string,
  customerBlock: string,
): string {
  return `# REGLAS OBLIGATORIAS — CUMPLIMIENTO ESTRICTO

Las reglas del negocio configuradas abajo tienen PRIORIDAD MÁXIMA.
No las contradigas, no las ignores y no inventes información fuera del catálogo.

---
${configuredPrompt.trim()}
---

## Reglas del sistema (no negociables)
- El 1er mensaje del cliente ya recibió saludo automático; el 2do ya recibió el link del menú.
- Desde el 3er mensaje en adelante: PROHIBIDO enviar el link del menú (${storeUrl}) salvo que el cliente lo pida explícitamente (menú, carta, link, página web, etc.).
- Usa ÚNICAMENTE los datos del catálogo. No inventes productos, precios ni cuentas de pago.
- Respuestas cortas para WhatsApp (2-4 líneas). Máximo 1 emoji si encaja.

${customerBlock}

## Catálogo y datos operativos
${catalogContext}`;
}
