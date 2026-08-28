import { Decimal128, type Document } from "mongodb";
import type { ShopTransaction } from "@/domain/types";
import { getDatabase } from "./mongodb";
import { databaseCollections } from "./databaseSchema";

const decimalFields = new Set(["quantity", "unitPrice", "revenue", "enteredQuantity", "normalizedQuantity", "value", "amount"]);

function toMongo(transaction: ShopTransaction): Document {
  return Object.fromEntries(Object.entries(transaction).map(([key, value]) => [key, decimalFields.has(key) && typeof value === "string" ? Decimal128.fromString(value) : value]));
}

function fromMongo(document: Document): ShopTransaction {
  const { _id: ignored, ...data } = document;
  void ignored;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value instanceof Decimal128 ? value.toString() : value])) as unknown as ShopTransaction;
}

export async function ensureTransactionIndexes() {
  const database = await getDatabase();
  const collection = database.collection("transactions");
  const definition = databaseCollections.find(({ name }) => name === "transactions");
  if (!definition) throw new Error("The transactions collection is not defined");
  await collection.createIndexes(definition.indexes);
}

export async function listTransactions(shopId: string): Promise<ShopTransaction[]> {
  const database = await getDatabase();
  const documents = await database.collection("transactions").find({ shopId }).sort({ businessDate: 1, createdAt: 1 }).limit(3000).toArray();
  return documents.map(fromMongo);
}

export async function createTransaction(transaction: ShopTransaction): Promise<ShopTransaction> {
  const database = await getDatabase();
  await ensureTransactionIndexes();
  const collection = database.collection("transactions");
  const existing = await collection.findOne({ shopId: transaction.shopId, idempotencyKey: transaction.idempotencyKey });
  if (existing) return fromMongo(existing);
  await collection.insertOne(toMongo(transaction));
  return transaction;
}
