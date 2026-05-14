import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

export async function connectTestDb() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function clearTestDb() {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(
      collections.map((collection) => collection.deleteMany({}))
    );
  }
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
  await mongoServer?.stop();
  mongoServer = null;
}
