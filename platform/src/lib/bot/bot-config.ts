export type WhatsappBotConfig = {
  enabled?: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  systemPrompt?: string;
  openwaBaseUrl?: string;
  openwaApiKey?: string;
  openwaSessionId?: string;
  webhookSecret?: string;
};

const CLOUDINARY_STORE_CONFIG_URL =
  process.env.NEXT_PUBLIC_STORE_CONFIG_URL ||
  'https://res.cloudinary.com/dimjm4ald/raw/upload/food/cod10/store-config-v3.json';

let cachedConfig: { value: WhatsappBotConfig; expiresAt: number } | null = null;

export async function fetchWhatsappBotConfigFromCloud(): Promise<WhatsappBotConfig | null> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.value;
  }

  const url =
    CLOUDINARY_STORE_CONFIG_URL +
    (CLOUDINARY_STORE_CONFIG_URL.includes('?') ? '&' : '?') +
    't=' +
    now;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { whatsappBot?: WhatsappBotConfig };
    if (!data?.whatsappBot) return null;

    cachedConfig = { value: data.whatsappBot, expiresAt: now + 60000 };
    return data.whatsappBot;
  } catch {
    return null;
  }
}

export async function getBotRuntimeConfig(): Promise<{
  enabled: boolean;
  geminiApiKey: string;
  geminiModel: string;
  systemPrompt: string;
  openwaBaseUrl: string;
  openwaApiKey: string;
  openwaSessionId: string;
  webhookSecret: string;
}> {
  const cloud = (await fetchWhatsappBotConfigFromCloud()) ?? {};

  return {
    enabled: cloud.enabled !== false,
    geminiApiKey: cloud.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '',
    geminiModel: cloud.geminiModel?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
    systemPrompt: cloud.systemPrompt?.trim() || '',
    openwaBaseUrl: cloud.openwaBaseUrl?.trim() || process.env.OPENWA_BASE_URL?.trim() || '',
    openwaApiKey: cloud.openwaApiKey?.trim() || process.env.OPENWA_API_KEY?.trim() || '',
    openwaSessionId: cloud.openwaSessionId?.trim() || process.env.OPENWA_SESSION_ID?.trim() || '',
    webhookSecret: cloud.webhookSecret?.trim() || process.env.WEBHOOK_SECRET?.trim() || '',
  };
}

export function clearBotConfigCache(): void {
  cachedConfig = null;
}
