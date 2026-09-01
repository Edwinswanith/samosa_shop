import { describe, expect, it } from "vitest";
import { createDemoState } from "./seed";
import type { ExpenseTransaction, InventoryTransaction, LpgRefillEvent, PaymentTransaction, SaleTransaction, StaffPayment, VegetableOrder } from "./types";
import { buildDailyExpenseHistory, calculateExpenseHistoryTotal } from "./expenseHistory";

const audit = { shopId: "main-shop", createdAt: "2026-09-01T08:00:00.000Z", createdBy: "owner" };

function stateForExpenses() {
  const state = createDemoState();
  const sale: SaleTransaction = { ...audit, id: "sale", idempotencyKey: "sale", kind: "sale", businessDate: "2026-09-01", productId: "samosa", channel: "University", quantity: "10", unitPrice: "14", revenue: "140", paymentMethod: "Credit" };
  const payment: PaymentTransaction = { ...audit, id: "payment", idempotencyKey: "payment", kind: "payment", businessDate: "2026-09-01", customerId: "university", amount: "140", paymentMethod: "UPI", direction: "received" };
  const purchase: InventoryTransaction = { ...audit, id: "purchase", idempotencyKey: "purchase", kind: "inventory", businessDate: "2026-09-01", itemId: "maida", transactionType: "purchase", enteredQuantity: "5", enteredUnit: "kg", normalizedQuantity: "5000", normalizedUnit: "g", value: "200" };
  const consumption: InventoryTransaction = { ...purchase, id: "consumption", idempotencyKey: "consumption", transactionType: "consumption", value: "80" };
  const operating: ExpenseTransaction = { ...audit, id: "transport", idempotencyKey: "transport", kind: "expense", businessDate: "2026-09-01", category: "Transport", amount: "50", paymentMethod: "Cash" };
  const investment: ExpenseTransaction = { ...operating, id: "investment", idempotencyKey: "investment", category: "Equipment investment", amount: "300", expenseType: "investment" };
  const vegetables: VegetableOrder = { id: "vegetables", shopId: "main-shop", businessDate: "2026-09-01", vendorId: "ravi", paymentStatus: "Pending", createdAt: audit.createdAt, updatedAt: audit.createdAt, items: [
    { id: "potato", name: "Potato", quantity: "4", unit: "kg", rate: "25", amount: "100" },
    { id: "cabbage", name: "Cabbage", quantity: "2", unit: "kg", rate: "25", amount: "50" },
  ] };
  const salary: StaffPayment = { id: "salary", idempotencyKey: "salary", staffId: "kaushal", businessDate: "2026-09-01", periodStart: "2026-08-24", periodEnd: "2026-08-31", paidOn: "2026-09-01", dailyRate: "100", fullDays: "6", halfDays: "0", amount: "600" };
  const refill: LpgRefillEvent = { id: "refill", cylinderId: "lpg-001", ranOutOn: "2026-09-01", refilledOn: "2026-09-01", amount: "2600", paymentStatus: "Due" };
  return { ...state, transactions: [sale, payment, purchase, consumption, operating, investment], vegetableOrders: [vegetables], staffPayments: [salary], lpgRefills: [refill] };
}

describe("daily expense history", () => {
  it("includes money-out records and excludes sales, receipts, and stock consumption", () => {
    const [day] = buildDailyExpenseHistory(stateForExpenses());

    expect(day).toMatchObject({ businessDate: "2026-09-01", total: "3900.00", paid: "1150.00", pending: "2750.00" });
    expect(day.items.map((item) => item.label)).toEqual(expect.arrayContaining(["Maida", "Transport", "Equipment investment", "Potato", "Cabbage", "Kousal salary", "LPG refill"]));
    expect(day.items.map((item) => item.label)).not.toContain("Samosa");
    expect(day.items).toHaveLength(7);
  });

  it("does not double-count an LPG lifecycle event already present in the expense ledger", () => {
    const state = stateForExpenses();
    state.transactions.push({ ...audit, id: "lpg-expense", idempotencyKey: "lpg-expense", kind: "expense", businessDate: "2026-09-01", category: "LPG", amount: "2600", paymentMethod: "Cash", note: "Lifecycle event refill" });

    const [day] = buildDailyExpenseHistory(state);
    expect(day.items.filter((item) => item.amount === "2600.00")).toHaveLength(1);
    expect(day).toMatchObject({ total: "3900.00", paid: "3750.00", pending: "150.00" });
  });

  it("groups dates newest first", () => {
    const state = stateForExpenses();
    state.transactions.push({ ...audit, id: "older", idempotencyKey: "older", kind: "expense", businessDate: "2026-08-31", category: "Repairs", amount: "10", paymentMethod: "Cash" });
    expect(buildDailyExpenseHistory(state).map((day) => day.businessDate)).toEqual(["2026-09-01", "2026-08-31"]);
  });

  it("totals the full history without floating-point money arithmetic", () => {
    expect(calculateExpenseHistoryTotal([{ businessDate: "2026-09-01", items: [], total: "0.10", paid: "0.10", pending: "0.00" }, { businessDate: "2026-08-31", items: [], total: "0.20", paid: "0.20", pending: "0.00" }])).toBe("0.30");
  });
});
