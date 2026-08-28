import { Decimal128, MongoClient, type Document } from "mongodb";
import { createDemoState } from "../src/domain/seed.ts";
import { databaseCollections } from "../src/server/databaseSchema.ts";

const uri = process.env.MONGODB_URI ?? "";
const databaseName = process.env.MONGODB_DB ?? "samosa_shop";
const shopId = "main-shop";
const decimalFields = new Set([
  "quantity", "unitPrice", "revenue", "enteredQuantity", "normalizedQuantity",
  "value", "amount", "defaultPrice", "lowStockAt", "cost", "monthlySalary",
  "advanceBalance", "countedCash",
  "rate", "paidAmount", "totalAmount", "monthlyAmount",
]);

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before running db:setup.");
  process.exit(1);
}

function withMongoDecimals(document: Document): Document {
  return Object.fromEntries(Object.entries(document).map(([key, value]) => [
    key,
    decimalFields.has(key) && typeof value === "string" && value !== ""
      ? Decimal128.fromString(value)
      : value,
  ]));
}

async function seedDatabase(client: MongoClient) {
  const database = client.db(databaseName);
  const state = createDemoState();
  const now = new Date().toISOString();

  await database.collection("shops").updateOne(
    { id: shopId },
    { $setOnInsert: { id: shopId, slug: "main-shop", name: "Samosa Shop", currency: "INR", timezone: "Asia/Kolkata", createdAt: now } },
    { upsert: true },
  );

  const seedGroups: Array<[string, Document[]]> = [
    ["items", state.items],
    ["products", state.products],
    ["vendors", state.vendors],
    ["customers", state.customers],
    ["vegetable_orders", state.vegetableOrders],
    ["advance_payments", state.advancePayments],
    ["recurring_rents", state.recurringRents],
    ["lpg_cylinders", state.cylinders],
    ["staff", state.staff],
    ["daily_closings", state.closings],
    ["transactions", state.transactions],
  ];

  for (const [collectionName, documents] of seedGroups) {
    if (documents.length === 0) continue;
    const collection = database.collection(collectionName);
    await collection.bulkWrite(documents.map((document) => {
      const seeded = withMongoDecimals({ ...document, shopId });
      const filter = collectionName === "daily_closings"
        ? { shopId, businessDate: document.businessDate }
        : { shopId, id: document.id };
      return { updateOne: { filter, update: { $setOnInsert: seeded }, upsert: true } };
    }), { ordered: false });
  }
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  try {
    await client.connect();
    const database = client.db(databaseName);
    const existing = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));

    for (const definition of databaseCollections) {
      if (!existing.has(definition.name)) await database.createCollection(definition.name);
      if (definition.indexes.length > 0) await database.collection(definition.name).createIndexes(definition.indexes);
    }

    await seedDatabase(client);

    const checkId = `setup-${crypto.randomUUID()}`;
    const checkCollection = database.collection("transactions");
    await checkCollection.insertOne({
      id: checkId, shopId, idempotencyKey: checkId, businessDate: "1970-01-01",
      kind: "connection-check", createdAt: new Date().toISOString(), createdBy: "db-setup",
    });
    const roundTripPassed = Boolean(await checkCollection.findOne({ id: checkId, shopId }));
    await checkCollection.deleteOne({ id: checkId, shopId });
    if (!roundTripPassed) throw new Error("Database write/read verification failed");

    const collectionCount = (await database.listCollections({}, { nameOnly: true }).toArray()).length;
    const transactionCount = await checkCollection.countDocuments({ shopId });
    console.log(`MongoDB setup complete: database=${databaseName}, collections=${collectionCount}, demoTransactions=${transactionCount}, roundTrip=passed`);
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(uri, "[redacted]") : "Unknown database setup error";
    console.error(`MongoDB setup failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

await main();
