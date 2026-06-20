import { createRequire } from 'module';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const { connectMongo } = require('../../../lib/cod10-api-src/mongo.js');

export async function GET() {
  try {
    await connectMongo();
    return Response.json({
      ok: true,
      service: 'cod10-api',
      mongo: mongoose.connection.readyState === 1,
      ready: mongoose.connection.readyState === 1,
      host: 'vercel',
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    );
  }
}
