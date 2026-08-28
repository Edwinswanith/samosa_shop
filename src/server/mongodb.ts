import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const mongoGlobal = globalThis as typeof globalThis & { __samosaMongoClientPromise?: Promise<MongoClient> };

function connectClient() {
  const promise = new MongoClient(uri!, {
    connectTimeoutMS: 5_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 10_000,
    maxPoolSize: 10,
  }).connect();
  mongoGlobal.__samosaMongoClientPromise = promise.catch((error) => {
    mongoGlobal.__samosaMongoClientPromise = undefined;
    throw error;
  });
  return mongoGlobal.__samosaMongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const client = await (mongoGlobal.__samosaMongoClientPromise ?? connectClient());
  return client.db(process.env.MONGODB_DB ?? "samosa_shop");
}
