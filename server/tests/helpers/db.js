import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export async function connect() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: 'crust_and_craft_test' });
}

export async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnect() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

/** Extract a single cookie value from a superagent response's set-cookie header. */
export function cookieValue(res, name) {
  const raw = res.headers['set-cookie'] || [];
  const match = raw.find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split(';')[0].slice(name.length + 1)) : null;
}
