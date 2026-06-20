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
const HOST = process.env.HOST || '0.0.0.0';

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const user = process.env.ATLAS_DB_USER;
  const pass = process.env.ATLAS_DB_PASSWORD;
  const host = process.env.ATLAS_CLUSTER_HOST;
  const db = process.env.ATLAS_DB_NAME || 'cod10';

  if (user && pass && host) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${db}?retryWrites=true&w=majority&appName=Codigo10`;
  }

  return 'mongodb://127.0.0.1:27017/cod10';
}

const MONGODB_URI = getMongoUri();
let bootstrapError = null;
let graphqlReady = false;

function maskUri(uri) {
  return uri.replace(/\/\/.*@/, '//***@');
}

async function bootstrap(app, httpServer) {
  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI && !process.env.ATLAS_DB_PASSWORD) {
    throw new Error(
      'Falta ATLAS_DB_PASSWORD en Render → Environment (clave de tecnosoftwareapp_db_user)'
    );
  }

  console.log('[cod10-api] Conectando MongoDB:', maskUri(MONGODB_URI));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect().catch(() => {});
  }
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 45000,
  });
  console.log('[cod10-api] MongoDB conectado');

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

  console.log('[cod10-api] GraphQL listo en /graphql');
  graphqlReady = true;
  bootstrapError = null;
}

async function main() {
  const app = express();

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
    res.status(200).json({
      ok: true,
      service: 'cod10-api',
      mongo: mongoose.connection.readyState === 1,
      ready: graphqlReady,
      error: bootstrapError ? String(bootstrapError.message || bootstrapError) : null,
    });
  });

  app.get('/', (_, res) => {
    res.json({
      service: 'cod10-api',
      graphql: '/graphql',
      health: '/health',
    });
  });

  const httpServer = http.createServer(app);

  httpServer.listen(PORT, HOST, () => {
    console.log(`[cod10-api] Escuchando http://${HOST}:${PORT}`);
    const run = () =>
      bootstrap(app, httpServer).catch((err) => {
        bootstrapError = err;
        graphqlReady = false;
        console.error('[cod10-api] Error bootstrap (reintento en 30s):', err.message || err);
        setTimeout(run, 30000);
      });
    run();
  });
}

main().catch((err) => {
  console.error('[cod10-api] Error fatal:', err);
  process.exit(1);
});
