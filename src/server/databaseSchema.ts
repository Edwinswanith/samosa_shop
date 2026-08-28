import type { IndexDescription } from "mongodb";

export interface CollectionDefinition {
  name: string;
  indexes: IndexDescription[];
}

export const databaseCollections: CollectionDefinition[] = [
  { name: "users", indexes: [{ key: { email: 1 }, unique: true, sparse: true }, { key: { shopId: 1, active: 1 } }] },
  { name: "shops", indexes: [{ key: { slug: 1 }, unique: true }] },
  { name: "products", indexes: [{ key: { shopId: 1, name: 1 }, unique: true }, { key: { shopId: 1, active: 1 } }] },
  { name: "items", indexes: [{ key: { shopId: 1, name: 1 }, unique: true }, { key: { shopId: 1, category: 1, active: 1 } }] },
  { name: "vendors", indexes: [{ key: { shopId: 1, name: 1 }, unique: true }] },
  { name: "customers", indexes: [{ key: { shopId: 1, name: 1 } }, { key: { shopId: 1, phone: 1 }, sparse: true }] },
  { name: "purchases", indexes: [{ key: { shopId: 1, businessDate: -1, vendorId: 1 } }, { key: { shopId: 1, idempotencyKey: 1 }, unique: true, sparse: true }] },
  { name: "vegetable_orders", indexes: [{ key: { shopId: 1, businessDate: -1 }, unique: true }, { key: { shopId: 1, updatedAt: -1 } }] },
  { name: "vendor_item_rates", indexes: [{ key: { shopId: 1, vendorId: 1, itemName: 1, unit: 1 }, unique: true }, { key: { shopId: 1, updatedAt: -1 } }] },
  { name: "advance_payments", indexes: [{ key: { shopId: 1, id: 1 }, unique: true }] },
  { name: "recurring_rents", indexes: [{ key: { shopId: 1, id: 1 }, unique: true }] },
  { name: "inventory_transactions", indexes: [{ key: { shopId: 1, itemId: 1, businessDate: -1 } }, { key: { shopId: 1, idempotencyKey: 1 }, unique: true }] },
  { name: "sales", indexes: [{ key: { shopId: 1, businessDate: -1, productId: 1 } }, { key: { shopId: 1, idempotencyKey: 1 }, unique: true }] },
  { name: "expenses", indexes: [{ key: { shopId: 1, businessDate: -1, category: 1 } }, { key: { shopId: 1, idempotencyKey: 1 }, unique: true }] },
  { name: "staff", indexes: [{ key: { shopId: 1, name: 1 }, unique: true }, { key: { shopId: 1, status: 1 } }] },
  { name: "staff_transactions", indexes: [{ key: { shopId: 1, staffId: 1, businessDate: -1 } }, { key: { shopId: 1, idempotencyKey: 1 }, unique: true }] },
  { name: "lpg_cylinders", indexes: [{ key: { shopId: 1, code: 1 }, unique: true }, { key: { shopId: 1, status: 1 } }] },
  { name: "lpg_refill_events", indexes: [{ key: { shopId: 1, id: 1 }, unique: true }, { key: { shopId: 1, refilledOn: -1 } }, { key: { shopId: 1, paymentStatus: 1 } }] },
  { name: "payments", indexes: [{ key: { shopId: 1, customerId: 1, businessDate: -1 } }, { key: { shopId: 1, idempotencyKey: 1 }, unique: true }] },
  { name: "daily_closings", indexes: [{ key: { shopId: 1, businessDate: 1 }, unique: true }] },
  { name: "settings", indexes: [{ key: { shopId: 1, key: 1 }, unique: true }] },
  { name: "transactions", indexes: [{ key: { shopId: 1, idempotencyKey: 1 }, unique: true }, { key: { shopId: 1, businessDate: -1, kind: 1 } }, { key: { shopId: 1, createdAt: -1 } }] },
];
