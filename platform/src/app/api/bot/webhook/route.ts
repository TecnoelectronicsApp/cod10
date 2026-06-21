import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/bot/auth';
import { buildBotCatalog, buildCatalogContext } from '@/lib/bot/catalog';
import { generateGeminiReply } from '@/lib/bot/gemini';
import { extractInboundMessage, sendOpenWAText, isBotEnabled, type OpenWAWebhookPayload } from '@/lib/bot/openwa';
import { buildFallbackReply } from '@/lib/bot/fallback-reply';
import {
  fetchChatHistory,
  getConversationTurn,
  replyForTurn,
} from '@/lib/bot/conversation-flow';
import { buildWhatsAppAccessUrl, whatsAppChatIdToPhone } from '@/lib/quick-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!(await isBotEnabled())) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'bot_disabled' });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-openwa-signature');

    if (!(await verifyWebhookSignature(rawBody, signature))) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as OpenWAWebhookPayload;
    const inbound = extractInboundMessage(payload);

    if (!inbound) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const turn = await getConversationTurn(inbound.sessionId, inbound.chatId);
    const scripted = replyForTurn(turn);

    let reply: string;
    let mode: 'welcome' | 'menu' | 'gemini' | 'fallback' = 'gemini';

    if (scripted) {
      reply = scripted;
      mode = turn === 1 ? 'welcome' : 'menu';
    } else {
      const catalog = await buildBotCatalog();
      const catalogContext = buildCatalogContext(catalog);
      const customerPhone = whatsAppChatIdToPhone(inbound.chatId);
      const quickAccessUrl = buildWhatsAppAccessUrl(customerPhone, '/');
      const history = await fetchChatHistory(inbound.sessionId, inbound.chatId);
      const contextWithCustomer = `${catalogContext}

DATOS DEL CLIENTE:
- Teléfono WhatsApp: ${customerPhone || 'no disponible'}
- Acceso rápido web (sin registro manual): ${quickAccessUrl}`;

      try {
        reply = await generateGeminiReply(contextWithCustomer, inbound.body, { history });
        mode = 'gemini';
      } catch (geminiError) {
        console.error('[api/bot/webhook] Gemini:', geminiError);
        reply = buildFallbackReply(catalog, inbound.body);
        mode = 'fallback';
      }
    }

    await sendOpenWAText({
      chatId: inbound.chatId,
      text: reply,
      sessionId: inbound.sessionId,
    });

    return NextResponse.json({ ok: true, replied: true, mode, turn });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[api/bot/webhook]', error);
    return NextResponse.json({ error: 'Webhook processing failed', detail }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-OpenWA-Signature',
    },
  });
}
