import { NextResponse } from 'next/server';
import { getBotRuntimeConfig, fetchWhatsappBotConfigFromCloud } from '@/lib/bot/bot-config';
import { buildBotCatalog } from '@/lib/bot/catalog';
import { generateGeminiReply } from '@/lib/bot/gemini';
import { buildCatalogContext } from '@/lib/bot/catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Check = { ok: boolean; detail: string };

async function checkOpenWA(
  baseUrl: string,
  apiKey: string,
  sessionId: string,
): Promise<Record<string, Check>> {
  const out: Record<string, Check> = {};
  const headers = { 'X-API-Key': apiKey, Accept: 'application/json' };

  try {
    const health = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' });
    out.server = { ok: health.ok, detail: health.ok ? 'OpenWA responde' : `HTTP ${health.status}` };
  } catch (e) {
    out.server = { ok: false, detail: e instanceof Error ? e.message : 'No alcanza OpenWA' };
    return out;
  }

  try {
    const res = await fetch(`${baseUrl}/api/sessions`, { headers, cache: 'no-store' });
    const sessions = (await res.json()) as Array<{ id: string; name: string; status: string; phone?: string }>;
    out.sessions = {
      ok: Array.isArray(sessions) && sessions.length > 0,
      detail:
        sessions.length === 0
          ? '⚠️ 0 sesiones — Render free borró la BD al reiniciar. Crea sesión y escanea QR.'
          : sessions.map((s) => `${s.name} (${s.id.slice(0, 8)}…): ${s.status}${s.phone ? ` ${s.phone}` : ''}`).join(' | '),
    };
  } catch (e) {
    out.sessions = { ok: false, detail: String(e) };
  }

  try {
    const res = await fetch(`${baseUrl}/api/webhooks`, { headers, cache: 'no-store' });
    const hooks = (await res.json()) as Array<{ url: string; active: boolean; lastTriggeredAt?: string }>;
    out.webhooks = {
      ok: hooks.length > 0,
      detail:
        hooks.length === 0
          ? '⚠️ 0 webhooks — hay que registrarlos tras cada reinicio de Render.'
          : hooks.map((h) => `${h.url} (activo: ${h.active}, último: ${h.lastTriggeredAt || 'nunca'})`).join(' | '),
    };
  } catch (e) {
    out.webhooks = { ok: false, detail: String(e) };
  }

  if (sessionId) {
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) {
        out.configuredSession = {
          ok: false,
          detail: `Session ID ${sessionId.slice(0, 8)}… NO existe en OpenWA (ID obsoleto del admin)`,
        };
      } else {
        const s = (await res.json()) as { status: string; phone?: string; lastError?: string };
        out.configuredSession = {
          ok: s.status === 'ready',
          detail: `Estado: ${s.status}${s.phone ? ` — ${s.phone}` : ''}${s.lastError ? ` — ${s.lastError}` : ''}`,
        };
      }
    } catch (e) {
      out.configuredSession = { ok: false, detail: String(e) };
    }
  }

  return out;
}

async function checkGemini(apiKey: string, model: string): Promise<Check> {
  if (!apiKey) return { ok: false, detail: 'Sin clave Gemini (admin o GEMINI_API_KEY)' };
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ok' }] }] }),
    });
    if (res.ok) return { ok: true, detail: `Gemini ${model} responde OK` };
    const err = await res.text();
    if (res.status === 429) {
      return { ok: true, detail: `Clave válida pero cuota temporal (429) — el bot usará respuesta fallback si persiste` };
    }
    return { ok: false, detail: `Gemini HTTP ${res.status}: ${err.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Error Gemini' };
  }
}

/** Diagnóstico completo del bot — GET /api/bot/diag */
export async function GET() {
  const runtime = await getBotRuntimeConfig();
  const cloud = await fetchWhatsappBotConfigFromCloud();
  const catalog = await buildBotCatalog();

  const checks: Record<string, Check | Record<string, Check>> = {
    botEnabled: { ok: runtime.enabled, detail: runtime.enabled ? 'Bot activado' : 'Bot desactivado en config' },
    cloudinary: {
      ok: !!cloud?.openwaBaseUrl && !!cloud?.geminiApiKey,
      detail: cloud
        ? `Cloudinary: URL=${!!cloud.openwaBaseUrl}, Gemini=${!!cloud.geminiApiKey}, Session=${cloud.openwaSessionId?.slice(0, 8) || '—'}…`
        : 'Sin whatsappBot en Cloudinary — guarda en admin',
    },
    catalog: {
      ok: catalog.products.length > 0,
      detail: `${catalog.products.length} productos, ${catalog.paymentMethods.length} métodos de pago`,
    },
    webhookUrl: {
      ok: true,
      detail: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cod10.vercel.app'}/api/bot/webhook`,
    },
  };

  if (runtime.openwaBaseUrl && runtime.openwaApiKey) {
    checks.openwa = await checkOpenWA(
      runtime.openwaBaseUrl.replace(/\/+$/, ''),
      runtime.openwaApiKey,
      runtime.openwaSessionId,
    );
  } else {
    checks.openwa = { config: { ok: false, detail: 'Falta URL o API Key OpenWA' } };
  }

  checks.gemini = await checkGemini(runtime.geminiApiKey, runtime.geminiModel);

  const flat = Object.values(checks).flatMap((v) =>
    typeof v === 'object' && 'ok' in v && 'detail' in v ? [v] : Object.values(v as Record<string, Check>),
  );
  const allOk = flat.every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? 'ok' : 'issues',
    at: new Date().toISOString(),
    hint:
      'Render FREE borra sesiones/webhooks al reiniciar (sin disco). Tras cada reinicio: crear sesión, QR, registrar webhook.',
    checks,
  });
}

/** Prueba el pipeline sin WhatsApp real — POST /api/bot/test { "message": "..." } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    const userMessage = body.message?.trim() || '¿Tienen hamburguesas?';
    const runtime = await getBotRuntimeConfig();
    const catalog = await buildBotCatalog();
    const context = buildCatalogContext(catalog);

    const steps: Array<{ step: string; ok: boolean; detail: string }> = [];

    steps.push({
      step: 'config',
      ok: !!(runtime.openwaBaseUrl && runtime.openwaApiKey),
      detail: `OpenWA=${runtime.openwaBaseUrl ? 'OK' : 'FALTA'}, Gemini=${runtime.geminiApiKey ? runtime.geminiApiKey.slice(0, 8) + '…' : 'FALTA'}`,
    });

    let reply = '';
    try {
      reply = await generateGeminiReply(context, userMessage);
      steps.push({ step: 'gemini', ok: true, detail: reply.slice(0, 200) + (reply.length > 200 ? '…' : '') });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ step: 'gemini', ok: false, detail: msg });
      const { buildFallbackReply } = await import('@/lib/bot/fallback-reply');
      reply = buildFallbackReply(catalog, userMessage);
      steps.push({ step: 'fallback', ok: true, detail: reply.slice(0, 200) + '…' });
    }

    return NextResponse.json({
      ok: steps.some((s) => s.step === 'gemini' && s.ok) || steps.some((s) => s.step === 'fallback'),
      message: userMessage,
      reply,
      steps,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 },
    );
  }
}
