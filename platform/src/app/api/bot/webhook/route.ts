import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/bot/auth';
import { buildBotCatalog, buildCatalogContext } from '@/lib/bot/catalog';
import { generateGeminiReply } from '@/lib/bot/gemini';
import { extractInboundMessage, sendOpenWAText, isBotEnabled, type OpenWAWebhookPayload } from '@/lib/bot/openwa';
import { buildFallbackReply } from '@/lib/bot/fallback-reply';
import { buildWhatsAppAccessUrl, whatsAppChatIdToPhone } from '@/lib/quick-auth';

export const dynamic = 'force-dynamic';

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

    const catalog = await buildBotCatalog();
    const catalogContext = buildCatalogContext(catalog);
    const customerPhone = whatsAppChatIdToPhone(inbound.chatId);
    const quickAccessUrl = buildWhatsAppAccessUrl(customerPhone, '/');
    const contextWithCustomer = `${catalogContext}

DATOS DEL CLIENTE (WhatsApp):
- Teléfono: ${customerPhone}
- Link de acceso rápido (1 clic, sin registro manual): ${quickAccessUrl}
Si el cliente quiere pedir en la web, envíale ese link. Al abrirlo entra solo con su número.`;

    let reply: string;
    try {
      reply = await generateGeminiReply(contextWithCustomer, inbound.body);
    } catch (geminiError) {
      console.error('[api/bot/webhook] Gemini fallback:', geminiError);
      reply = buildFallbackReply(catalog, inbound.body);
    }

    await sendOpenWAText({
      chatId: inbound.chatId,
      text: reply,
      quotedMessageId: inbound.messageId,
      sessionId: inbound.sessionId,
    });

    return NextResponse.json({ ok: true, replied: true });
  } catch (error) {
    console.error('[api/bot/webhook]', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
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
