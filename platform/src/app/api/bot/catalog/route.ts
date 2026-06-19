import { NextResponse } from 'next/server';
import { checkBotApiKey } from '@/lib/bot/auth';
import { buildBotCatalog } from '@/lib/bot/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!checkBotApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const catalog = await buildBotCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error('[api/bot/catalog]', error);
    return NextResponse.json({ error: 'Failed to build catalog' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
