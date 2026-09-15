import { Decimal128, MongoClient } from "mongodb";
import { createDemoState } from "../src/domain/seed.ts";
import { databaseCollections } from "../src/server/databaseSchema.ts";

const uri = process.env.MONGODB_URI ?? "";
const databaseName = process.env.MONGODB_DB ?? "samosa_shop";
const shopId = "main-shop";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before importing operations.");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  try {
    await client.connect();
    const database = client.db(databaseName);
    const state = createDemoState();
    const existing = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
    for (const name of ["customers", "vegetable_orders", "vendor_item_rates", "advance_payments", "recurring_rents", "lpg_refill_events", "settings"]) {
      const definition = databaseCollections.find((candidate) => candidate.name === name);
      if (!existing.has(name)) await database.createCollection(name);
      if (definition) await database.collection(name).createIndexes(definition.indexes);
    }

    await database.collection("customers").bulkWrite(state.customers.map((customer) => ({ updateOne: {
      filter: { shopId, id: customer.id },
      update: { $set: { ...customer, shopId } },
      upsert: true,
    } })));

    await database.collection("vegetable_orders").bulkWrite(state.vegetableOrders.map((order) => {
      const { vendorId, ...insertOnly } = order;
      return { updateOne: {
        filter: { shopId, id: order.id },
        update: {
          $set: { vendorId },
          $setOnInsert: { ...insertOnly, shopId, items: order.items.map((item) => ({ ...item, quantity: Decimal128.fromString(item.quantity) })) },
        },
        upsert: true,
      } };
    }));

    await database.collection("vendor_item_rates").bulkWrite(state.vendorItemRates.map((rate) => ({ updateOne: {
      filter: { shopId, vendorId: rate.vendorId, itemName: rate.itemName, unit: rate.unit },
      update: { $set: { ...rate, shopId, rate: Decimal128.fromString(rate.rate) } },
      upsert: true,
    } })));

    const vegetableItems = state.items.filter((item) => item.category === "Vegetables");
    await database.collection("items").bulkWrite(vegetableItems.map((item) => ({
      updateOne: { filter: { shopId, id: item.id }, update: { $set: { ...item, shopId } }, upsert: true },
    })));

    await database.collection("advance_payments").bulkWrite(state.advancePayments.map((advance) => ({ updateOne: {
      filter: { shopId, id: advance.id },
      update: { $setOnInsert: { ...advance, shopId, paidAmount: Decimal128.fromString(advance.paidAmount), totalAmount: Decimal128.fromString(advance.totalAmount) } },
      upsert: true,
    } })));
    await database.collection("recurring_rents").bulkWrite(state.recurringRents.map((rent) => ({ updateOne: {
      filter: { shopId, id: rent.id },
      update: { $setOnInsert: { ...rent, shopId, monthlyAmount: Decimal128.fromString(rent.monthlyAmount) } },
      upsert: true,
    } })));

    await database.collection("settings").updateOne({ shopId, key: "lpg-pricing" }, { $set: {
      shopId, key: "lpg-pricing",
      initialCostPerCylinder: Decimal128.fromString(state.lpgPricing.initialCostPerCylinder),
      refillCost: Decimal128.fromString(state.lpgPricing.refillCost),
    } }, { upsert: true });

    console.log(`Operations import complete: customers=${state.customers.length}, vegetableOrders=${state.vegetableOrders.length}, vendorRates=${state.vendorItemRates.length}, advances=${state.advancePayments.length}, rents=${state.recurringRents.length}, lpgInitial=${state.lpgPricing.initialCostPerCylinder}, lpgRefill=${state.lpgPricing.refillCost}`);
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(uri, "[redacted]") : "Unknown operations import error";
    console.error(`Operations import failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

await main();
