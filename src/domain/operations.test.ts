import { describe, expect, it } from "vitest";
import { createDemoState } from "./seed";
import { calculateCylinderDays, calculateFinancialSnapshot, calculateLpgPaymentSnapshot, calculateStaffSalary, calculateVegetableLineAmount, calculateVegetableOrderTotal, findVendorPrimaryRate, getPendingVegetablePayments, getVegetablePaymentStatus } from "./operations";

describe("operations projections", () => {
  it("keeps vegetable totals pending until every line has an amount", () => {
    expect(calculateVegetableOrderTotal(createDemoState().vegetableOrders[0])).toBeUndefined();
  });

  it("counts LPG usage inclusively from the start date", () => {
    expect(calculateCylinderDays("2026-08-24", undefined, "2026-08-27")).toBe(4);
    expect(calculateCylinderDays(undefined, undefined, "2026-08-27")).toBeUndefined();
  });

  it("calculates salary with a Sunday half-day", () => {
    expect(calculateStaffSalary("1000", "7", "1")).toBe("7500.00");
    expect(calculateStaffSalary("600", "7", "1")).toBe("4500.00");
  });

  it("calculates a vegetable line from quantity and vendor rate", () => {
    expect(calculateVegetableLineAmount({ id: "potato", name: "Potato", quantity: "20", unit: "kg", rate: "12.50" })).toBe("250.00");
  });

  it("keeps a vegetable line pending while quantity or rate is being edited", () => {
    expect(calculateVegetableLineAmount({ id: "potato", name: "Potato", quantity: "", unit: "kg", rate: "25" })).toBeUndefined();
    expect(calculateVegetableLineAmount({ id: "potato", name: "Potato", quantity: ".", unit: "kg", rate: "25" })).toBeUndefined();
    expect(calculateVegetableLineAmount({ id: "potato", name: "Potato", quantity: "20", unit: "kg", rate: "." })).toBeUndefined();
  });

  it("treats legacy vegetable orders without a payment status as pending", () => {
    const order = structuredClone(createDemoState().vegetableOrders[0]);
    delete order.paymentStatus;
    delete order.paidOn;
    expect(getVegetablePaymentStatus(order)).toBe("Pending");
  });

  it("lists pending vegetable bills by date with their known totals", () => {
    const [paid, pending] = structuredClone(createDemoState().vegetableOrders);
    paid.paymentStatus = "Paid";
    paid.paidOn = paid.businessDate;
    pending.paymentStatus = "Pending";
    pending.paidOn = undefined;
    pending.items = [{ id: "potato", name: "Potato", quantity: "10", unit: "kg", rate: "25", amount: "250" }];

    expect(getPendingVegetablePayments([paid, pending])).toEqual([
      { businessDate: pending.businessDate, total: "250.00" },
    ]);
  });

  it("finds a vendor's current primary rate without changing historical orders", () => {
    const state = createDemoState();
    expect(findVendorPrimaryRate(state.vendorItemRates, "ravi", "Potato", "kg")).toBe("25.00");
    expect(state.vegetableOrders[0].items[0].rate).toBeUndefined();
  });

  it("keeps paid advances, pending commitments, and rent distinct", () => {
    expect(calculateFinancialSnapshot(createDemoState())).toEqual({
      advancesPaid: "64450.00",
      advancesPending: "25000.00",
      monthlyRent: "12000.00",
    });
  });

  it("keeps cylinder pricing and refill dues distinct from the existing advance", () => {
    const state = createDemoState();
    expect(state.lpgPricing).toEqual({ initialCostPerCylinder: "4600.00", refillCost: "2600.00" });
    expect(calculateLpgPaymentSnapshot(state)).toEqual({ paid: "4000.00", due: "0.00", refillCount: 0 });
  });
});
