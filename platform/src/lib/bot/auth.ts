import { createHmac, timingSafeEqual } from 'crypto';
import { getWebhookSecret } from './openwa';

export function checkBotApiKey(request: Request): boolean {
  const expected = process.env.BOT_API_KEY;
  if (!expected) return true;
  return request.headers.get('x-api-key') === expected;
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = await getWebhookSecret();
  if (!secret) return true;
  if (!signature) return false;

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
