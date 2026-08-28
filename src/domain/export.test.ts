import { describe, expect, it } from "vitest";
import { transactionsToCsv } from "./export";
import { createDemoState } from "./seed";

describe("transaction export", () => {
  it("creates a portable CSV with business dates and exact values", () => {
    const csv = transactionsToCsv(createDemoState().transactions);
    expect(csv).toContain("businessDate,kind,reference,quantity,unit,amount,paymentMethod");
    expect(csv).toContain("2026-08-27,inventory,potato,15.5,kg,465.00,");
    expect(csv).toContain("2026-08-27,sale,samosa,400,piece,5600,Credit");
    expect(csv).toContain("2026-08-27,sale,kathi-roll,10,piece,650,Credit");
    expect(csv).toContain("2026-08-27,expense,Labour,,,900.00,Cash");
    expect(csv).toContain("2026-08-25,payment,university,,,5773.50,UPI");
  });
});
