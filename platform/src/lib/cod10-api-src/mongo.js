const mongoose = require('mongoose');

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

let cached = global.__cod10Mongoose;

if (!cached) {
  cached = global.__cod10Mongoose = { conn: null, promise: null, seeded: false };
}

async function connectMongo() {
  if (cached.conn) return cached.conn;

  const uri = getMongoUri();
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 60000,
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;

  if (!cached.seeded) {
    const { Category } = require('./models');
    const { runSeed } = require('./seed');
    const n = await Category.countDocuments();
    if (n === 0) {
      await runSeed({ reset: false, disconnect: false });
    }
    cached.seeded = true;
  }

  return cached.conn;
}

module.exports = { connectMongo, getMongoUri };
