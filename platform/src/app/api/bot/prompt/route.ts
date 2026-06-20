import { NextResponse } from 'next/server';
import { getBotRuntimeConfig } from '@/lib/bot/bot-config';
import { loadSystemPrompt } from '@/lib/bot/system-prompt';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = await getBotRuntimeConfig();
  const hasGemini = !!runtime.geminiApiKey;
  const hasOpenwa = !!(runtime.openwaBaseUrl && runtime.openwaApiKey && runtime.openwaSessionId);

  return NextResponse.json({
    source: runtime.systemPrompt
      ? 'admin Cloudinary (whatsappBot.systemPrompt)'
      : 'config/gemini-system-prompt.txt',
    enabled: runtime.enabled,
    geminiConfigured: hasGemini,
    openwaConfigured: hasOpenwa,
    geminiModel: runtime.geminiModel,
    prompt: runtime.systemPrompt || loadSystemPrompt(),
    editHint:
      'Edita en cod10-admin → Configuración → Bot WhatsApp (IA), sección Prompt del bot.',
  });
}
