import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer = null;

/**
 * Connect to MongoDB. In test mode, if MONGODB_URI points at a `_test` database
 * we still connect normally; callers may opt into an in-memory server.
 */
export async function connectDatabase(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    logger.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('[db] MongoDB connection error:', err.message);
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  logger.info(`[db] Connected to MongoDB (${mongoose.connection.name})`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('[db] MongoDB connection closed');
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

/** Spin up an in-memory MongoDB for tests. Returns the connection URI. */
export async function startMemoryDatabase() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'crust_and_craft_test' } });
  const uri = memoryServer.getUri();
  await connectDatabase(uri);
  return uri;
}

export function getConnectionState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

export default { connectDatabase, disconnectDatabase, getConnectionState };
