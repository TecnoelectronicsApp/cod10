require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { PubSub } = require('graphql-subscriptions');

const typeDefs = require('./schema');
const { createResolvers } = require('./resolvers');
const { authContext } = require('./auth');

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cod10';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[cod10-api] MongoDB conectado:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));

  const { Category } = require('./models');
  const { runSeed } = require('./seed');
  const categoryCount = await Category.countDocuments();
  if (categoryCount === 0) {
    console.log('[cod10-api] Base de datos vacía — seed automático…');
    await runSeed({ reset: false, disconnect: false });
  }

  const pubsub = new PubSub();
  const resolvers = createResolvers(pubsub);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const app = express();
  const httpServer = http.createServer(app);

  const corsOrigins = (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
      credentials: true,
    })
  );

  app.get('/health', (_, res) => {
    res.json({ ok: true, service: 'cod10-api', mongo: mongoose.connection.readyState === 1 });
  });

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const serverCleanup = useServer({ schema }, wsServer);

  const apollo = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apollo.start();

  app.use(
    '/graphql',
    express.json({ limit: '10mb' }),
    expressMiddleware(apollo, {
      context: async ({ req }) => ({
        user: authContext(req),
      }),
    })
  );

  httpServer.listen(PORT, () => {
    console.log(`[cod10-api] GraphQL http://localhost:${PORT}/graphql`);
    console.log(`[cod10-api] WebSocket ws://localhost:${PORT}/graphql`);
    console.log(`[cod10-api] Health  http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error('[cod10-api] Error fatal:', err);
  process.exit(1);
});
