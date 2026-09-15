import { describe, expect, it } from "vitest";
import { createDemoState } from "./seed";
import { calculateCustomerCreditStatus, calculateDashboard, calculateInventory, calculatePeriodSummary, calculateReceivable, calculateSettlementAmountThroughDate, calculateTotalReceivable } from "./ledger";

describe("shop ledger projections", () => {
  const state = createDemoState();

  it("derives inventory from ledger movements and editable vegetable orders", () => {
    const inventory = calculateInventory(state);
    expect(Object.fromEntries(inventory.map((item) => [item.itemId, item.quantity]))).toMatchObject({
      potato: "76600",
      onion: "3050",
      cabbage: "14000",
      carrot: "1500",
      "bell-pepper": "1000",
      beans: "500",
      tomato: "1000",
      brinjal: "500",
      coriander: "1",
    });
  });

  it("ignores cost-only vegetable lines with zero quantity when calculating stock", () => {
    const stateWithCostOnlyLine = {
      ...state,
      vegetableOrders: [...state.vegetableOrders, {
        ...state.vegetableOrders[0],
        id: "vegetables-cost-only",
        businessDate: "2026-09-11",
        items: [{ id: "tomato-cost-only", name: "Tomato", quantity: "0", unit: "kg" as const, amount: "10.00" }],
      }],
    };

    expect(() => calculateInventory(stateWithCostOnlyLine)).not.toThrow();
    expect(calculateInventory(stateWithCostOnlyLine).find((item) => item.itemId === "tomato")?.quantity).toBe("1000");
  });

  it("keeps customer invoices and payments reconcilable", () => {
    expect(calculateReceivable(state, "university")).toBe("10110.00");
    const withCanteenSale = {
      ...state,
      transactions: [...state.transactions, {
        ...state.transactions.find((transaction) => transaction.kind === "sale")!,
        id: "canteen-sale", idempotencyKey: "canteen-sale", customerId: "vit-canteen", revenue: "2800.00",
      }],
    };
    expect(calculateTotalReceivable(withCanteenSale)).toBe("12910.00");
  });

  it("allocates customer receipts oldest-first and exposes the paid-through date", () => {
    expect(calculateCustomerCreditStatus(state, "university")).toEqual({
      invoiced: "20110.00",
      paid: "10000.00",
      pending: "10110.00",
      paidThroughDate: "2026-08-24",
      rows: [
        { businessDate: "2026-08-21", invoiced: "420.00", allocated: "420.00", pending: "0.00", status: "Paid" },
        { businessDate: "2026-08-24", invoiced: "4900.00", allocated: "4900.00", pending: "0.00", status: "Paid" },
        { businessDate: "2026-08-25", invoiced: "5684.00", allocated: "4680.00", pending: "1004.00", status: "Partial" },
        { businessDate: "2026-08-26", invoiced: "2856.00", allocated: "0.00", pending: "2856.00", status: "Pending" },
        { businessDate: "2026-08-27", invoiced: "6250.00", allocated: "0.00", pending: "6250.00", status: "Pending" },
      ],
    });
    expect(calculateSettlementAmountThroughDate(state, "university", "2026-08-25")).toBe("1004.00");
    expect(calculateSettlementAmountThroughDate(state, "university", "2026-08-27")).toBe("10110.00");
  });

  it("separates cash flow from operating profit", () => {
    const dashboard = calculateDashboard(state, "2026-08-27");
    expect(dashboard.revenue).toBe("6250.00");
    expect(dashboard.cashFlow).toBe("-6390.00");
    expect(dashboard.estimatedProfit).toBe("3838.50");
    expect(dashboard.materialsConsumed).toBe("1511.50");
    expect(dashboard.unitsSold).toBe("410");
  });

  it("summarizes lifetime and selected daily sales without floating point drift", () => {
    const summary = calculatePeriodSummary(state);
    expect(summary.revenue).toBe("20110.00");
    expect(summary.spending).toBe("10616.50");
    expect(summary.profit).toBe("9493.50");
    expect(state.transactions).toContainEqual(expect.objectContaining({
      id: "investment-stand-rack-2026-08-27", kind: "expense", expenseType: "investment",
      category: "Equipment investment", amount: "6920.00", note: "Stand and rack",
    }));
    expect(state.transactions).toContainEqual(expect.objectContaining({
      id: "investment-mixture-2026-08-27", kind: "expense", expenseType: "investment",
      category: "Equipment investment", amount: "1500.00", note: "Mixture asset",
    }));
    expect(summary.dailySales).toHaveLength(5);
    expect(summary.dailySales.at(-1)).toEqual({
      businessDate: "2026-08-27",
      samosaQuantity: "400",
      samosaRevenue: "5600.00",
      kathiRollQuantity: "10",
      kathiRollRevenue: "650.00",
      revenue: "6250.00",
    });
    expect(calculatePeriodSummary(state, "2026-08-24", "2026-08-25").revenue).toBe("10584.00");
  });
});
