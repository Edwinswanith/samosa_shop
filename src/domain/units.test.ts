import { describe, expect, it } from "vitest";
import { normalizeQuantity } from "./units";

describe("quantity normalization", () => {
  it("normalizes kilograms to grams", () => {
    expect(normalizeQuantity("0.25", "kg")).toEqual({ quantity: "250", unit: "g", dimension: "weight" });
  });

  it("normalizes litres to millilitres", () => {
    expect(normalizeQuantity("0.5", "l")).toEqual({ quantity: "500", unit: "ml", dimension: "volume" });
  });

  it("preserves count units", () => {
    expect(normalizeQuantity("3", "cylinder")).toEqual({ quantity: "3", unit: "cylinder", dimension: "count" });
  });

  it("rejects a non-positive quantity", () => {
    expect(() => normalizeQuantity("0", "kg")).toThrow("greater than zero");
  });
});
