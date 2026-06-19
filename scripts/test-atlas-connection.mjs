/**
 * Prueba conexión Atlas — uso interno setup.
 * MONGODB_URI en env o argumento.
 */
import mongoose from 'mongoose';

const uri =
  process.argv[2] ||
  process.env.MONGODB_URI ||
  '';

if (!uri) {
  console.error('Falta MONGODB_URI');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log('OK', cols.map((c) => c.name).join(', ') || '(vacío)');
  await mongoose.disconnect();
  process.exit(0);
} catch (e) {
  console.error('FAIL', e.message);
  process.exit(1);
}
