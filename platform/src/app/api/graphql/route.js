import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createRequire } from 'module';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const require = createRequire(import.meta.url);
const { connectMongo } = require('../../../lib/cod10-api-src/mongo.js');
const typeDefs = require('../../../lib/cod10-api-src/schema.js');
const { createResolvers } = require('../../../lib/cod10-api-src/resolvers.js');
const { authContext } = require('../../../lib/cod10-api-src/auth.js');
const { PubSub } = require('graphql-subscriptions');

const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  'https://cod10.vercel.app,https://cod10-admin.vercel.app,http://localhost:3000,http://localhost:3006'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowOrigin =
    ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
      ? origin || ALLOWED_ORIGINS[0]
      : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

function withCors(response, request) {
  const headers = corsHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

let handler;

async function getHandler() {
  if (handler) return handler;

  await connectMongo();
  const pubsub = new PubSub();
  const resolvers = createResolvers(pubsub);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({ schema });
  await server.start();

  handler = startServerAndCreateNextHandler(server, {
    context: async (req) => ({
      user: authContext(req),
    }),
  });

  return handler;
}

export async function OPTIONS(request) {
  return withCors(new Response(null, { status: 204 }), request);
}

export async function GET(request) {
  const res = await (await getHandler())(request);
  return withCors(res, request);
}

export async function POST(request) {
  const res = await (await getHandler())(request);
  return withCors(res, request);
}
