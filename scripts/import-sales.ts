import { Decimal128, MongoClient, type Document } from "mongodb";
import { createDemoState } from "../src/domain/seed.ts";

const uri = process.env.MONGODB_URI ?? "";
const databaseName = process.env.MONGODB_DB ?? "samosa_shop";
const shopId = "main-shop";
const legacySaleIds = ["s-university", "s-walkin", "s-roll", "s-u-2", "s-u-3"];
const decimalFields = new Set(["quantity", "unitPrice", "revenue"]);

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before importing sales.");
  process.exit(1);
}

function withMongoDecimals(document: Document): Document {
  return Object.fromEntries(Object.entries(document).map(([key, value]) => [
    key,
    decimalFields.has(key) && typeof value === "string" ? Decimal128.fromString(value) : value,
  ]));
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  try {
    await client.connect();
    const database = client.db(databaseName);
    const transactions = database.collection("transactions");
    const sales = createDemoState().transactions.filter((entry) => entry.kind === "sale");
    const products = createDemoState().products;
    const canonicalIds = sales.map((sale) => sale.id);
    const suppliedDateProducts = sales.map((sale) => ({ businessDate: sale.businessDate, productId: sale.productId }));

    await transactions.deleteMany({ shopId, id: { $in: legacySaleIds } });
    await transactions.deleteMany({
      shopId,
      kind: "sale",
      id: { $nin: canonicalIds },
      $or: suppliedDateProducts,
    });
    await transactions.bulkWrite(sales.map((sale) => ({
      updateOne: {
        filter: { shopId, id: sale.id },
        update: { $set: withMongoDecimals({ ...sale, shopId }) },
        upsert: true,
      },
    })));
    await database.collection("products").bulkWrite(products.map((product) => ({
      updateOne: {
        filter: { shopId, id: product.id },
        update: { $set: withMongoDecimals({ ...product, shopId }) },
        upsert: true,
      },
    })));

    console.log(`Sales import complete: dates=5, salesEntries=${sales.length}, samosaRate=14, kathiRollRate=65`);
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(uri, "[redacted]") : "Unknown sales import error";
    console.error(`Sales import failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

await main();
