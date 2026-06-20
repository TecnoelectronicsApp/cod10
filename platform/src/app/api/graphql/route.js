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

export async function GET(request) {
  return (await getHandler())(request);
}

export async function POST(request) {
  return (await getHandler())(request);
}
