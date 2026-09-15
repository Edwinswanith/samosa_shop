import { describe, expect, it } from "vitest";
import { transactionSchema } from "./transactionSchema";

describe("transaction API validation", () => {
  it("accepts precise decimal strings", () => {
    const result = transactionSchema.safeParse({
      id: "sale-1", shopId: "main-shop", kind: "sale", businessDate: "2026-08-27",
      createdAt: "2026-08-27T06:30:00.000Z", createdBy: "owner", idempotencyKey: "sale-1",
      productId: "samosa", channel: "Walk-in", quantity: "0.1", unitPrice: "20.00",
      revenue: "2.00", paymentMethod: "Cash",
    });
    expect(result.success).toBe(true);
  });

  it("requires a customer account for University sales", () => {
    const universitySale = {
      id: "sale-vit-1", shopId: "main-shop", kind: "sale", businessDate: "2026-09-15",
      createdAt: "2026-09-15T06:30:00.000Z", createdBy: "owner", idempotencyKey: "sale-vit-1",
      productId: "samosa", channel: "University", quantity: "200", unitPrice: "14.00",
      revenue: "2800.00", paymentMethod: "Credit",
    };

    expect(transactionSchema.safeParse(universitySale).success).toBe(false);
    expect(transactionSchema.safeParse({ ...universitySale, customerId: "vit-canteen" }).success).toBe(true);
  });

  it("rejects JavaScript numeric money values", () => {
    const result = transactionSchema.safeParse({
      id: "expense-1", shopId: "main-shop", kind: "expense", businessDate: "2026-08-27",
      createdAt: "2026-08-27T06:30:00.000Z", createdBy: "owner", idempotencyKey: "expense-1",
      category: "Labour", amount: 900, paymentMethod: "Cash",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an auditable customer payment through a selected sales date", () => {
    expect(transactionSchema.safeParse({
      id: "payment-1", shopId: "main-shop", kind: "payment", businessDate: "2026-08-27",
      createdAt: "2026-08-27T06:30:00.000Z", createdBy: "owner", idempotencyKey: "payment-1",
      customerId: "university", amount: "1004.00", paymentMethod: "UPI", direction: "received",
      settlesThroughDate: "2026-08-25", note: "Closes sales through 25 August",
    }).success).toBe(true);
  });

  it("accepts a one-time equipment investment", () => {
    const result = transactionSchema.safeParse({
      id: "investment-1", shopId: "main-shop", kind: "expense", businessDate: "2026-08-27",
      createdAt: "2026-08-27T06:30:00.000Z", createdBy: "owner", idempotencyKey: "investment-1",
      expenseType: "investment", category: "Equipment investment", amount: "6920.00",
      paymentMethod: "Cash", note: "Stand and rack",
    });
    expect(result.success && result.data.kind === "expense" && result.data.expenseType).toBe("investment");
  });
});
