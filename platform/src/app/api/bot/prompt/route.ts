import { NextResponse } from 'next/server';
import { getBotRuntimeConfig } from '@/lib/bot/bot-config';
import { resolveConfiguredSystemPrompt } from '@/lib/bot/system-prompt';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = await getBotRuntimeConfig();
  const hasGemini = !!runtime.geminiApiKey;
  const hasOpenwa = !!(runtime.openwaBaseUrl && runtime.openwaApiKey && runtime.openwaSessionId);
  const { prompt, source } = resolveConfiguredSystemPrompt(runtime.systemPrompt);

  const sourceLabel: Record<typeof source, string> = {
    admin: 'admin Cloudinary (whatsappBot.systemPrompt)',
    env: 'GEMINI_SYSTEM_PROMPT (Vercel)',
    file: 'config/gemini-system-prompt.txt',
    default: 'prompt mínimo por defecto — configura uno en admin',
  };

  return NextResponse.json({
    source: sourceLabel[source],
    sourceKey: source,
    configured: source === 'admin',
    enabled: runtime.enabled,
    geminiConfigured: hasGemini,
    openwaConfigured: hasOpenwa,
    geminiModel: runtime.geminiModel,
    prompt,
    editHint:
      'Edita en cod10-admin → Configuración → Bot WhatsApp (IA). El prompt se aplica como reglas obligatorias.',
  });
}
