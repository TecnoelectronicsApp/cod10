import { getBotRuntimeConfig } from './bot-config';

const STORE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app').replace(/\/$/, '');

export const WELCOME_MESSAGE =
  '¡Hola! 👋 Gracias por escribir a *Codigo 10*.\n¿Qué se te antoja hoy?';

export const MENU_LINK_REPLY = `Aquí tienes nuestro menú 🍔\n\n${STORE_URL}`;

/** Reinicia saludo si pasaron 4+ horas sin mensajes en el chat */
const SESSION_GAP_SEC = 4 * 60 * 60;

/** true = primer mensaje del cliente en la ventana actual */
export type ConversationTurn = 1 | 'ongoing';

export type ChatMessage = { body: string; fromCustomer: boolean };

type MessageRow = {
  body?: string;
  direction?: string;
  chatId?: string;
  timestamp?: number;
};

const MENU_REQUEST =
  /\b(men[uú]|carta|cat[aá]logo|productos|link|enlace|url|p[aá]gina|sitio|web|ordenar|pedir\s+online|ver\s+(el\s+)?men[uú]|qu[eé]\s+tienen|que\s+tienen|muestr(a|ame|ar)\s+(el\s+)?men[uú]|env[ií]a(me)?\s+(el\s+)?(link|men[uú]))/i;

export function wantsMenuLink(text: string): boolean {
  return MENU_REQUEST.test(text.trim());
}

export async function getConversationTurn(
  sessionId: string,
  chatId: string,
): Promise<ConversationTurn> {
  const windowIncoming = await fetchIncomingInCurrentWindow(sessionId, chatId);
  return windowIncoming.length <= 1 ? 1 : 'ongoing';
}

export async function fetchChatHistory(
  sessionId: string,
  chatId: string,
  limit = 12,
): Promise<ChatMessage[]> {
  const rows = await fetchMessages(sessionId, chatId, limit);
  return rows
    .filter((m): m is MessageRow & { body: string } => Boolean(m.body?.trim()))
    .map((m) => ({
      body: m.body.trim(),
      fromCustomer: m.direction === 'incoming',
    }));
}

export function replyForFirstTurn(): string {
  return WELCOME_MESSAGE;
}

async function fetchIncomingInCurrentWindow(
  sessionId: string,
  chatId: string,
): Promise<MessageRow[]> {
  const all = await fetchMessages(sessionId, chatId, 50);
  if (all.length === 0) return [];

  let windowStartIdx = 0;
  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1].timestamp ?? 0;
    const curr = all[i].timestamp ?? 0;
    if (curr - prev > SESSION_GAP_SEC) {
      windowStartIdx = i;
    }
  }

  return all.slice(windowStartIdx).filter((m) => m.direction === 'incoming');
}

async function fetchMessages(
  sessionId: string,
  chatId: string,
  limit: number,
): Promise<MessageRow[]> {
  const runtime = await getBotRuntimeConfig();
  const baseUrl = runtime.openwaBaseUrl.replace(/\/+$/, '');
  if (!baseUrl || !runtime.openwaApiKey) return [];

  const params = new URLSearchParams({ chatId, limit: String(limit) });

  const res = await fetch(
    `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages?${params}`,
    {
      headers: { 'X-API-Key': runtime.openwaApiKey, Accept: 'application/json' },
      cache: 'no-store',
    },
  );

  if (!res.ok) return [];

  const data = (await res.json()) as { messages?: MessageRow[] };
  return (data.messages ?? []).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}
