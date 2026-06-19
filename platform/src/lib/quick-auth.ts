/** Normaliza teléfono venezolano u internacional a solo dígitos (ej. 584126733360). */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0') && digits.length === 11) {
    digits = '58' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('4')) {
    digits = '58' + digits;
  }

  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const p = normalizePhone(phone);
  if (p.startsWith('58') && p.length === 12) {
    return `0${p.slice(2, 5)}-${p.slice(5, 8)}-${p.slice(8)}`;
  }
  return p;
}

export function phoneToAuthEmail(phone: string): string {
  return `${normalizePhone(phone)}@wa.cod10.app`;
}

export function phoneToCredentials(phone: string, name?: string) {
  const normalized = normalizePhone(phone);
  return {
    email: phoneToAuthEmail(normalized),
    password: normalized,
    name: name?.trim() || `Cliente ${normalized.slice(-4)}`,
    phone: normalized,
  };
}

/** Extrae teléfono desde chatId de WhatsApp (58412...@c.us). */
export function whatsAppChatIdToPhone(chatId: string): string {
  return normalizePhone(chatId.split('@')[0] || chatId);
}

export function buildWhatsAppAccessUrl(phone: string, redirect = '/'): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app').replace(/\/$/, '');
  const params = new URLSearchParams({
    phone: normalizePhone(phone),
    auto: '1',
    redirect,
  });
  return `${base}/login?${params.toString()}`;
}
