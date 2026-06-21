/** Evita respuestas triples cuando OpenWA reintenta el webhook por timeout. */

const TTL_MS = 15 * 60 * 1000;
const inflight = new Map<string, Promise<unknown>>();
const completed = new Map<string, number>();

function pruneCompleted(): void {
  const now = Date.now();
  completed.forEach((at, key) => {
    if (now - at > TTL_MS) completed.delete(key);
  });
}

export function buildDedupeKey(
  sessionId: string,
  messageId: string,
  idempotencyKey?: string,
): string {
  return idempotencyKey?.trim() || `${sessionId}:${messageId}`;
}

/**
 * Ejecuta fn una sola vez por clave. Reintentos paralelos de OpenWA esperan
 * el mismo resultado y no envían otro WhatsApp.
 */
export async function processWebhookOnce<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<{ status: 'processed'; value: T } | { status: 'duplicate' }> {
  pruneCompleted();

  if (completed.has(key)) {
    return { status: 'duplicate' };
  }

  const existing = inflight.get(key);
  if (existing) {
    await existing.catch(() => undefined);
    return { status: 'duplicate' };
  }

  const run = fn()
    .then((value) => {
      completed.set(key, Date.now());
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, run);
  const value = await run;
  return { status: 'processed', value };
}
