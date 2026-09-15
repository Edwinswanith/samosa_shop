import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/seed";
import { operationMutationSchema } from "./operationsSchema";

describe("operationMutationSchema", () => {
  it("accepts a persisted customer location", () => {
    expect(operationMutationSchema.safeParse({ entity: "customer", data: {
      id: "vit-canteen", name: "VIT Canteen", note: "Separate credit account",
    } }).success).toBe(true);
  });

  it("accepts a vegetable order with amounts still pending", () => {
    expect(operationMutationSchema.safeParse({ entity: "vegetableOrder", data: createDemoState().vegetableOrders[0] }).success).toBe(true);
  });

  it("requires a paid date only when a vegetable bill is marked paid", () => {
    const paid = structuredClone(createDemoState().vegetableOrders[0]);
    paid.paymentStatus = "Paid";
    paid.paidOn = paid.businessDate;
    expect(operationMutationSchema.safeParse({ entity: "vegetableOrder", data: paid }).success).toBe(true);

    paid.paidOn = undefined;
    expect(operationMutationSchema.safeParse({ entity: "vegetableOrder", data: paid }).success).toBe(false);

    paid.paymentStatus = "Pending";
    expect(operationMutationSchema.safeParse({ entity: "vegetableOrder", data: paid }).success).toBe(true);
  });

  it("rejects negative quantities", () => {
    const order = structuredClone(createDemoState().vegetableOrders[0]);
    order.items[0].quantity = "-1";
    expect(operationMutationSchema.safeParse({ entity: "vegetableOrder", data: order }).success).toBe(false);
  });

  it("accepts vendor rates and rejects an advance total below the paid amount", () => {
    const order = structuredClone(createDemoState().vegetableOrders[0]);
    order.items[0].rate = "12.50";
    expect(operationMutationSchema.safeParse({ entity: "vegetableOrder", data: order }).success).toBe(true);
    const withPrimaryRates = operationMutationSchema.safeParse({ entity: "vegetableOrder", data: order, setAsPrimaryRates: true });
    expect(withPrimaryRates.success).toBe(true);
    if (withPrimaryRates.success && withPrimaryRates.data.entity === "vegetableOrder") expect(withPrimaryRates.data.setAsPrimaryRates).toBe(true);
    expect(operationMutationSchema.safeParse({ entity: "advancePayment", data: { id: "shop", label: "Shop", paidAmount: "50000", totalAmount: "25000" } }).success).toBe(false);
  });

  it("accepts an editable vendor primary rate", () => {
    expect(operationMutationSchema.safeParse({ entity: "vendorItemRate", data: {
      id: "ravi-potato-kg", shopId: "main-shop", vendorId: "ravi", itemName: "Potato", unit: "kg",
      rate: "25.00", updatedAt: "2026-08-27T08:00:00.000Z",
    } }).success).toBe(true);
  });

  it("accepts LPG pricing and a payable refill event", () => {
    expect(operationMutationSchema.safeParse({ entity: "lpgPricing", data: createDemoState().lpgPricing }).success).toBe(true);
    expect(operationMutationSchema.safeParse({ entity: "lpgRefillEvent", data: {
      id: "refill-1", cylinderId: "lpg-001", ranOutOn: "2026-09-10", refilledOn: "2026-09-10",
      amount: "2600.00", paymentStatus: "Due", previousStartedOn: "2026-08-24",
    } }).success).toBe(true);
  });

  it("accepts an auditable paid salary and rejects an incorrect total", () => {
    const payment = {
      id: "salary-kaushal-2026-08-31", idempotencyKey: "salary-kaushal-2026-08-31", staffId: "kaushal", businessDate: "2026-08-31", periodStart: "2026-08-24", periodEnd: "2026-08-31",
      paidOn: "2026-08-31", dailyRate: "1000.00", fullDays: "7", halfDays: "1", amount: "7500.00", note: "Sunday half-day",
    };
    expect(operationMutationSchema.safeParse({ entity: "staffPayment", data: payment }).success).toBe(true);
    expect(operationMutationSchema.safeParse({ entity: "staffPayment", data: { ...payment, amount: "8000.00" } }).success).toBe(false);
  });
});
