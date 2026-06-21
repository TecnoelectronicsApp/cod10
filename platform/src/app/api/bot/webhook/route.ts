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
  wantsMenuLink,
  MENU_LINK_REPLY,
} from '@/lib/bot/conversation-flow';
import { buildDedupeKey, processWebhookOnce } from '@/lib/bot/webhook-dedupe';
import { buildWhatsAppAccessUrl, whatsAppChatIdToPhone } from '@/lib/quick-auth';
import { estimateDelivery, formatDeliveryEstimate } from '@/lib/bot/delivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleInboundMessage(inbound: {
  chatId: string;
  messageId: string;
  body: string;
  sessionId: string;
  location?: { lat: number; lng: number; address?: string };
}) {
  const turn = await getConversationTurn(inbound.sessionId, inbound.chatId);
  const scripted = replyForTurn(turn);

  let reply: string;
  let mode: 'welcome' | 'menu' | 'gemini' | 'fallback' = 'gemini';

  if (scripted) {
    reply = scripted;
    mode = turn === 1 ? 'welcome' : 'menu';
  } else if (wantsMenuLink(inbound.body)) {
    reply = MENU_LINK_REPLY;
    mode = 'menu';
  } else {
    const catalog = await buildBotCatalog();
    const catalogContext = buildCatalogContext(catalog);
    const customerPhone = whatsAppChatIdToPhone(inbound.chatId);
    const checkoutUrl = buildWhatsAppAccessUrl(customerPhone, '/checkout');
    const history = await fetchChatHistory(inbound.sessionId, inbound.chatId);

    const deliveryEstimate = inbound.location
      ? await estimateDelivery({ lat: inbound.location.lat, lng: inbound.location.lng })
      : await estimateDelivery({ text: inbound.body });

    const deliveryBlock = deliveryEstimate
      ? formatDeliveryEstimate(deliveryEstimate, catalog.currencySymbol)
      : 'Sin estimación de delivery aún — pide dirección o ubicación de WhatsApp.';

    const customerBlock = `DATOS DEL CLIENTE:
- Teléfono WhatsApp: ${customerPhone || 'no disponible'}
- Acceso rápido checkout: ${checkoutUrl}
- ${deliveryBlock}`;

    try {
      reply = await generateGeminiReply(catalogContext, inbound.body, {
        history,
        customerBlock,
      });
      mode = 'gemini';
    } catch (geminiError) {
      console.error('[api/bot/webhook] Gemini:', geminiError);
      reply = buildFallbackReply(catalog, inbound.body, {
        deliveryEstimate,
        customerPhone,
      });
      mode = 'fallback';
    }
  }

  await sendOpenWAText({
    chatId: inbound.chatId,
    text: reply,
    sessionId: inbound.sessionId,
  });

  return { mode, turn };
}

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

    const dedupeKey = buildDedupeKey(
      inbound.sessionId,
      inbound.messageId,
      payload.idempotencyKey,
    );

    const outcome = await processWebhookOnce(dedupeKey, () => handleInboundMessage(inbound));

    if (outcome.status === 'duplicate') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'duplicate_delivery' });
    }

    return NextResponse.json({ ok: true, replied: true, ...outcome.value });
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
