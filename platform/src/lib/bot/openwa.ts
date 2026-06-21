import { getBotRuntimeConfig } from './bot-config';

export type OpenWAWebhookPayload = {
  event: string;
  timestamp: string;
  sessionId: string;
  idempotencyKey?: string;
  deliveryId?: string;
  data: {
    id?: string;
    chatId?: string;
    from?: string;
    body?: string;
    type?: string;
    fromMe?: boolean;
    isGroup?: boolean;
    location?: {
      latitude: number;
      longitude: number;
      description?: string;
      address?: string;
    };
  };
};

export function extractInboundMessage(payload: OpenWAWebhookPayload): {
  chatId: string;
  messageId: string;
  body: string;
  sessionId: string;
  location?: { lat: number; lng: number; address?: string };
} | null {
  if (payload.event !== 'message.received') return null;
  const msg = payload.data;
  if (!msg || msg.fromMe || msg.isGroup) return null;
  if (!msg.chatId || !msg.id) return null;

  if (msg.type === 'location' && msg.location) {
    const lat = Number(msg.location.latitude);
    const lng = Number(msg.location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      chatId: msg.chatId,
      messageId: msg.id,
      body: msg.location.address || msg.location.description || `[ubicación] ${lat}, ${lng}`,
      sessionId: payload.sessionId,
      location: {
        lat,
        lng,
        address: msg.location.address || msg.location.description,
      },
    };
  }

  if (msg.type !== 'text' || !msg.body?.trim()) return null;

  return {
    chatId: msg.chatId,
    messageId: msg.id,
    body: msg.body.trim(),
    sessionId: payload.sessionId,
  };
}

export async function sendOpenWAText(opts: {
  chatId: string;
  text: string;
  quotedMessageId?: string;
  sessionId?: string;
}): Promise<void> {
  const runtime = await getBotRuntimeConfig();
  const baseUrl = runtime.openwaBaseUrl.replace(/\/+$/, '');
  const apiKey = runtime.openwaApiKey;
  const sessionId = opts.sessionId ?? runtime.openwaSessionId;

  if (!baseUrl || !apiKey || !sessionId) {
    throw new Error('OpenWA not configured (admin → Bot WhatsApp → URL, API Key, Session ID)');
  }

  const body: Record<string, string> = {
    chatId: opts.chatId,
    text: opts.text,
  };
  if (opts.quotedMessageId) {
    body.quotedMessageId = opts.quotedMessageId;
  }

  const response = await fetch(
    `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenWA send-text error ${response.status}: ${errText.slice(0, 300)}`);
  }
}

export async function getWebhookSecret(): Promise<string | undefined> {
  const runtime = await getBotRuntimeConfig();
  return runtime.webhookSecret || undefined;
}

export async function isBotEnabled(): Promise<boolean> {
  const runtime = await getBotRuntimeConfig();
  return runtime.enabled;
}
