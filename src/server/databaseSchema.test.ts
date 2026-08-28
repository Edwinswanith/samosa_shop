import { describe, expect, it } from "vitest";
import { databaseCollections } from "./databaseSchema";

describe("databaseCollections", () => {
  it("defines every operational collection exactly once", () => {
    const names = databaseCollections.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(expect.arrayContaining([
      "shops", "products", "items", "vendors", "customers", "transactions",
      "inventory_transactions", "vegetable_orders", "vendor_item_rates", "advance_payments", "recurring_rents", "sales", "expenses", "payments", "staff",
      "staff_transactions", "lpg_cylinders", "lpg_refill_events", "daily_closings", "settings",
    ]));
  });

  it("protects idempotent transaction writes with a unique compound index", () => {
    const transactions = databaseCollections.find(({ name }) => name === "transactions");
    expect(transactions?.indexes).toContainEqual(expect.objectContaining({
      key: { shopId: 1, idempotencyKey: 1 },
      unique: true,
    }));
  });
});
