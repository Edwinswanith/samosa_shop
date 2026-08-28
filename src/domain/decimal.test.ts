import { describe, expect, it } from "vitest";
import { addMoney, calculateLineAmount, deriveRate, formatMoney } from "./decimal";

describe("precise money", () => {
  it("adds decimal amounts without floating point drift", () => {
    expect(addMoney(["0.10", "0.20", "136.50"])).toBe("136.80");
  });

  it("calculates a line amount from quantity and rate", () => {
    expect(calculateLineAmount("3.25", "42")).toBe("136.50");
  });

  it("formats Indian rupees", () => {
    expect(formatMoney("5840")).toBe("₹5,840.00");
  });

  it("derives an effective rate from the vendor total", () => {
    expect(deriveRate("5", "180")).toBe("36.00");
  });

  it("rejects an invalid rate quantity", () => {
    expect(() => deriveRate("0", "180")).toThrow("greater than zero");
    expect(() => addMoney(["not-money"])).toThrow("valid decimal");
  });
});
