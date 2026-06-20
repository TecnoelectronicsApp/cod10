import { NextResponse } from 'next/server';
import { getBotRuntimeConfig } from '@/lib/bot/bot-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Despierta OpenWA en Render free (sin tráfico ~15 min se duerme). Invocado por Vercel Cron. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const config = await getBotRuntimeConfig();
  const baseUrl = (config.openwaBaseUrl || process.env.OPENWA_BASE_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    return NextResponse.json({ ok: false, reason: 'OPENWA_BASE_URL no configurada' });
  }

  try {
    const res = await fetch(`${baseUrl}/api/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      openwa: baseUrl,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      openwa: baseUrl,
      error: err instanceof Error ? err.message : 'fetch failed',
      at: new Date().toISOString(),
    });
  }
}
