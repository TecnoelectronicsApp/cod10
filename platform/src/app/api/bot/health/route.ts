import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cod10-bot',
    version: '2.0.0',
    source: 'mongodb-via-graphql',
    endpoints: ['/api/bot/catalog', '/api/bot/webhook', '/api/bot/health'],
  });
}
