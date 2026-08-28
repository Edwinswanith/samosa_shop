import { Decimal128, type Document } from "mongodb";
import { primaryRatesFromOrder } from "@/domain/operations";
import type { AdvancePayment, LpgCylinder, LpgPricing, LpgRefillEvent, RecurringRent, StaffMember, VendorItemRate, VegetableOrder } from "@/domain/types";
import { getDatabase } from "./mongodb";
import { databaseCollections } from "./databaseSchema";

const shopId = "main-shop";
let operationIndexesPromise: Promise<void> | undefined;

export function ensureOperationIndexes() {
  operationIndexesPromise ??= getDatabase().then(async (database) => {
    await Promise.all(["vegetable_orders", "vendor_item_rates", "lpg_cylinders", "lpg_refill_events", "staff", "advance_payments", "recurring_rents", "settings"].map(async (name) => {
      const definition = databaseCollections.find((candidate) => candidate.name === name);
      if (definition) await database.collection(name).createIndexes(definition.indexes);
    }));
  }).catch((error) => {
    operationIndexesPromise = undefined;
    throw error;
  });
  return operationIndexesPromise;
}

function documentData(document: Document) {
  const { _id: ignored, shopId: ignoredShop, ...data } = document;
  void ignored; void ignoredShop;
  return data;
}

export function vegetableFromMongo(document: Document): VegetableOrder {
  const data = documentData(document);
  return {
    ...data,
    shopId: String(document.shopId),
    items: (data.items as Document[]).map((item) => ({
      ...item,
      quantity: item.quantity instanceof Decimal128 ? item.quantity.toString() : String(item.quantity),
      rate: item.rate instanceof Decimal128 ? item.rate.toString() : item.rate,
      amount: item.amount instanceof Decimal128 ? item.amount.toString() : item.amount,
    })),
  } as VegetableOrder;
}

function vendorRateFromMongo(document: Document): VendorItemRate {
  const data = documentData(document);
  return { ...data, shopId: String(document.shopId), rate: data.rate instanceof Decimal128 ? data.rate.toString() : String(data.rate) } as VendorItemRate;
}

function advanceFromMongo(document: Document): AdvancePayment {
  const data = documentData(document);
  return { ...data, paidAmount: data.paidAmount instanceof Decimal128 ? data.paidAmount.toString() : String(data.paidAmount), totalAmount: data.totalAmount instanceof Decimal128 ? data.totalAmount.toString() : String(data.totalAmount) } as AdvancePayment;
}

function rentFromMongo(document: Document): RecurringRent {
  const data = documentData(document);
  return { ...data, monthlyAmount: data.monthlyAmount instanceof Decimal128 ? data.monthlyAmount.toString() : String(data.monthlyAmount) } as RecurringRent;
}

function cylinderFromMongo(document: Document): LpgCylinder {
  const data = documentData(document);
  return { ...data, cost: data.cost instanceof Decimal128 ? data.cost.toString() : data.cost } as LpgCylinder;
}

function staffFromMongo(document: Document): StaffMember {
  const data = documentData(document);
  return {
    ...data,
    monthlySalary: data.monthlySalary instanceof Decimal128 ? data.monthlySalary.toString() : String(data.monthlySalary),
    advanceBalance: data.advanceBalance instanceof Decimal128 ? data.advanceBalance.toString() : String(data.advanceBalance),
  } as StaffMember;
}

function refillFromMongo(document: Document): LpgRefillEvent {
  const data = documentData(document);
  return { ...data, amount: data.amount instanceof Decimal128 ? data.amount.toString() : String(data.amount) } as LpgRefillEvent;
}

export async function listOperations() {
  const database = await getDatabase();
  const [vegetableOrders, vendorItemRates, cylinders, lpgRefills, pricing, staff, advancePayments, recurringRents] = await Promise.all([
    database.collection("vegetable_orders").find({ shopId }).sort({ businessDate: -1 }).limit(180).toArray(),
    database.collection("vendor_item_rates").find({ shopId }).sort({ itemName: 1 }).toArray(),
    database.collection("lpg_cylinders").find({ shopId }).sort({ code: 1 }).toArray(),
    database.collection("lpg_refill_events").find({ shopId }).sort({ refilledOn: -1 }).toArray(),
    database.collection("settings").findOne({ shopId, key: "lpg-pricing" }),
    database.collection("staff").find({ shopId }).sort({ name: 1 }).toArray(),
    database.collection("advance_payments").find({ shopId }).sort({ label: 1 }).toArray(),
    database.collection("recurring_rents").find({ shopId }).sort({ label: 1 }).toArray(),
  ]);
  return {
    vegetableOrders: vegetableOrders.map(vegetableFromMongo),
    vendorItemRates: vendorItemRates.map(vendorRateFromMongo),
    cylinders: cylinders.map(cylinderFromMongo),
    lpgRefills: lpgRefills.map(refillFromMongo),
    lpgPricing: pricing ? {
      initialCostPerCylinder: pricing.initialCostPerCylinder instanceof Decimal128 ? pricing.initialCostPerCylinder.toString() : String(pricing.initialCostPerCylinder),
      refillCost: pricing.refillCost instanceof Decimal128 ? pricing.refillCost.toString() : String(pricing.refillCost),
    } : { initialCostPerCylinder: "4600.00", refillCost: "2600.00" },
    staff: staff.map(staffFromMongo),
    advancePayments: advancePayments.map(advanceFromMongo),
    recurringRents: recurringRents.map(rentFromMongo),
  };
}

export async function saveVegetableOrder(order: VegetableOrder, setAsPrimaryRates = false) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  const stored = {
    ...order,
    shopId,
    items: order.items.map((item) => ({
      ...item,
      quantity: Decimal128.fromString(item.quantity),
      rate: item.rate ? Decimal128.fromString(item.rate) : undefined,
      amount: item.amount ? Decimal128.fromString(item.amount) : undefined,
    })),
  };
  await database.collection("vegetable_orders").updateOne({ shopId, id: order.id }, { $set: stored }, { upsert: true });
  if (setAsPrimaryRates) {
    const rates = primaryRatesFromOrder({ ...order, shopId });
    if (rates.length) await database.collection("vendor_item_rates").bulkWrite(rates.map((rate) => ({ updateOne: {
      filter: { shopId, vendorId: rate.vendorId, itemName: rate.itemName, unit: rate.unit },
      update: { $set: { ...rate, shopId, rate: Decimal128.fromString(rate.rate) } },
      upsert: true,
    } })));
  }
  return order;
}

export async function saveVendorItemRate(rate: VendorItemRate) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  await database.collection("vendor_item_rates").updateOne(
    { shopId, vendorId: rate.vendorId, itemName: rate.itemName, unit: rate.unit },
    { $set: { ...rate, shopId, rate: Decimal128.fromString(rate.rate) } },
    { upsert: true },
  );
  return rate;
}

export async function saveAdvancePayment(advance: AdvancePayment) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  const stored = { ...advance, shopId, paidAmount: Decimal128.fromString(advance.paidAmount), totalAmount: Decimal128.fromString(advance.totalAmount) };
  await database.collection("advance_payments").updateOne({ shopId, id: advance.id }, { $set: stored }, { upsert: true });
  return advance;
}

export async function saveRecurringRent(rent: RecurringRent) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  const stored = { ...rent, shopId, monthlyAmount: Decimal128.fromString(rent.monthlyAmount) };
  await database.collection("recurring_rents").updateOne({ shopId, id: rent.id }, { $set: stored }, { upsert: true });
  return rent;
}

export async function deleteVegetableOrder(id: string) {
  const database = await getDatabase();
  await database.collection("vegetable_orders").deleteOne({ shopId, id });
}

export async function saveCylinder(cylinder: LpgCylinder) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  const stored = { ...cylinder, shopId, cost: cylinder.cost ? Decimal128.fromString(cylinder.cost) : undefined };
  await database.collection("lpg_cylinders").updateOne({ shopId, id: cylinder.id }, { $set: stored }, { upsert: true });
  return cylinder;
}

export async function saveStaffMember(member: StaffMember) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  const stored = {
    ...member, shopId,
    monthlySalary: Decimal128.fromString(member.monthlySalary),
    advanceBalance: Decimal128.fromString(member.advanceBalance),
  };
  await database.collection("staff").updateOne({ shopId, id: member.id }, { $set: stored }, { upsert: true });
  return member;
}

export async function saveLpgPricing(pricing: LpgPricing) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  await database.collection("settings").updateOne({ shopId, key: "lpg-pricing" }, { $set: {
    shopId, key: "lpg-pricing", initialCostPerCylinder: Decimal128.fromString(pricing.initialCostPerCylinder), refillCost: Decimal128.fromString(pricing.refillCost),
  } }, { upsert: true });
  return pricing;
}

export async function saveLpgRefillEvent(event: LpgRefillEvent) {
  await ensureOperationIndexes();
  const database = await getDatabase();
  await database.collection("lpg_refill_events").updateOne({ shopId, id: event.id }, { $set: { ...event, shopId, amount: Decimal128.fromString(event.amount) } }, { upsert: true });
  return event;
}
