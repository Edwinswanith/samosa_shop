import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function decimal(value: string): Decimal {
  try {
    const parsed = new Decimal(value || "0");
    if (!parsed.isFinite()) throw new Error("Enter a valid decimal value");
    return parsed;
  } catch {
    throw new Error("Enter a valid decimal value");
  }
}

export function money(value: Decimal.Value): string {
  return new Decimal(value).toDecimalPlaces(2).toFixed(2);
}

export function addMoney(values: string[]): string {
  return money(values.reduce((total, value) => total.plus(decimal(value)), new Decimal(0)));
}

export function calculateLineAmount(quantity: string, rate: string): string {
  return money(decimal(quantity).times(decimal(rate)));
}

export function deriveRate(quantity: string, total: string): string {
  const parsedQuantity = decimal(quantity);
  if (parsedQuantity.lte(0)) throw new Error("Quantity must be greater than zero");
  return decimal(total).dividedBy(parsedQuantity).toDecimalPlaces(2).toFixed(2);
}

export function formatMoney(value: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimal(value).toNumber());
}

export function formatCompactMoney(value: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(decimal(value).toNumber());
}
