export type OpenWAWebhookPayload = {
  event: string;
  timestamp: string;
  sessionId: string;
  data: {
    id?: string;
    chatId?: string;
    from?: string;
    body?: string;
    type?: string;
    fromMe?: boolean;
    isGroup?: boolean;
  };
};

export function extractInboundMessage(payload: OpenWAWebhookPayload): {
  chatId: string;
  messageId: string;
  body: string;
  sessionId: string;
} | null {
  if (payload.event !== 'message.received') return null;
  const msg = payload.data;
  if (!msg || msg.fromMe || msg.isGroup) return null;
  if (msg.type !== 'text' || !msg.body?.trim()) return null;
  if (!msg.chatId || !msg.id) return null;

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
  const baseUrl = process.env.OPENWA_BASE_URL?.replace(/\/+$/, '');
  const apiKey = process.env.OPENWA_API_KEY;
  const sessionId = opts.sessionId ?? process.env.OPENWA_SESSION_ID;

  if (!baseUrl || !apiKey || !sessionId) {
    throw new Error('OPENWA_BASE_URL, OPENWA_API_KEY and OPENWA_SESSION_ID required');
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
