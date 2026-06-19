import { NextResponse } from 'next/server';
import { buildBotCatalog, buildCatalogContext } from '@/lib/bot/catalog';

export const dynamic = 'force-dynamic';

/** Contexto de catálogo en texto plano para debugging / OpenWA plugin */
export async function GET() {
  try {
    const catalog = await buildBotCatalog();
    const context = buildCatalogContext(catalog);
    return new NextResponse(context, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('[api/bot/context]', error);
    return NextResponse.json({ error: 'Failed to build context' }, { status: 500 });
  }
}
