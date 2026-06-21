import {
  buildFullStoreConfig,
  fetchStoreConfigFromCloudinary,
  uploadStoreConfigToCloudinary,
  getPaymentMethodsConfig,
  loadPaymentMethodsConfig,
  saveStoreConfigRemote,
} from "./paymentMethods";

export const WHATSAPP_BOT_STORAGE_KEY = "cod10-whatsapp-bot";

export const DEFAULT_WHATSAPP_BOT_PROMPT = `Eres el asistente de ventas de Codigo 10 por WhatsApp. Tono humano, cálido y breve (Venezuela).

Flujo: el 1er mensaje del cliente ya recibió saludo; el 2do ya recibió el link del menú. Tú respondes desde el 3er mensaje.

Usa SOLO el catálogo (productos, precios USD/Bs, tasa BCV, delivery, pagos). No inventes datos.
Si preguntan el dólar → tasa BCV del catálogo. Menú web: https://cod10.vercel.app
No vuelques listas largas; responde lo que pregunten con naturalidad. 1 emoji máximo.`;

export const defaultWhatsappBotConfig = {
  enabled: true,
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash",
  systemPrompt: DEFAULT_WHATSAPP_BOT_PROMPT,
  openwaBaseUrl: "",
  openwaApiKey: "",
  openwaSessionId: "",
  webhookSecret: "",
};

export function normalizeWhatsappBotConfig(config) {
  const bot = (config && config.whatsappBot) || config || {};
  return Object.assign({}, defaultWhatsappBotConfig, bot, {
    enabled: bot.enabled !== false,
    geminiModel: bot.geminiModel || defaultWhatsappBotConfig.geminiModel,
    systemPrompt:
      typeof bot.systemPrompt === "string" && bot.systemPrompt.trim()
        ? bot.systemPrompt.trim()
        : defaultWhatsappBotConfig.systemPrompt,
  });
}

export function getWhatsappBotConfigLocal() {
  try {
    const raw = localStorage.getItem(WHATSAPP_BOT_STORAGE_KEY);
    if (raw) return normalizeWhatsappBotConfig(JSON.parse(raw));
  } catch (e) {
    console.error(e);
  }
  return normalizeWhatsappBotConfig({});
}

export function saveWhatsappBotConfigLocal(bot) {
  const normalized = normalizeWhatsappBotConfig({ whatsappBot: bot });
  localStorage.setItem(WHATSAPP_BOT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function loadWhatsappBotConfig() {
  const local = getWhatsappBotConfigLocal();

  try {
    const cloud = await fetchStoreConfigFromCloudinary();
    if (cloud && cloud.whatsappBot) {
      const merged = normalizeWhatsappBotConfig({
        whatsappBot: Object.assign({}, cloud.whatsappBot, {
          geminiApiKey:
            local.geminiApiKey || cloud.whatsappBot.geminiApiKey || "",
          openwaApiKey:
            local.openwaApiKey || cloud.whatsappBot.openwaApiKey || "",
          webhookSecret:
            local.webhookSecret || cloud.whatsappBot.webhookSecret || "",
        }),
      });
      saveWhatsappBotConfigLocal(merged);
      return merged;
    }
  } catch (e) {
    console.warn("WhatsApp bot config desde Cloudinary:", e.message);
  }

  return local;
}

export async function syncWhatsappBotToServer(botConfig) {
  const normalized = normalizeWhatsappBotConfig({ whatsappBot: botConfig });
  saveWhatsappBotConfigLocal(normalized);

  let paymentMethods;
  try {
    paymentMethods = await loadPaymentMethodsConfig();
  } catch (e) {
    paymentMethods = getPaymentMethodsConfig().paymentMethods;
  }

  const full = buildFullStoreConfig(
    { paymentMethods: paymentMethods },
    null,
    normalized
  );

  let cloudinary = false;
  let remote = false;
  let cloudinaryError = "";
  let remoteError = "";

  try {
    await uploadStoreConfigToCloudinary(full);
    cloudinary = true;
  } catch (e) {
    cloudinaryError = e.message || String(e);
  }

  try {
    await saveStoreConfigRemote(full);
    remote = true;
  } catch (e) {
    remoteError = e.message || String(e);
  }

  return {
    ok: cloudinary || remote,
    cloudinary: cloudinary,
    remote: remote,
    cloudinaryError: cloudinaryError,
    remoteError: remoteError,
  };
}
