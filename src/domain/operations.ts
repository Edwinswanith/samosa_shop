import Decimal from "decimal.js";
import { money } from "./decimal";
import type { ShopState, VendorItemRate, VegetableOrder, VegetableOrderLine } from "./types";

export function calculateVegetableLineAmount(line: VegetableOrderLine): string | undefined {
  try {
    if (line.rate?.trim() && line.quantity.trim()) {
      const quantity = new Decimal(line.quantity);
      const rate = new Decimal(line.rate);
      if (!quantity.isFinite() || !rate.isFinite()) return undefined;
      return money(quantity.times(rate));
    }
    return line.amount?.trim() ? money(line.amount) : undefined;
  } catch {
    return undefined;
  }
}

export function calculateVegetableOrderTotal(order: VegetableOrder): string | undefined {
  const amounts = order.items.map(calculateVegetableLineAmount).filter((amount): amount is string => Boolean(amount));
  if (amounts.length !== order.items.length) return undefined;
  return money(amounts.reduce((total, amount) => total.plus(amount), new Decimal(0)));
}

export function getVegetablePaymentStatus(order: VegetableOrder): "Pending" | "Paid" {
  return order.paymentStatus === "Paid" ? "Paid" : "Pending";
}

export function getPendingVegetablePayments(orders: VegetableOrder[]) {
  return orders
    .filter((order) => getVegetablePaymentStatus(order) === "Pending")
    .map((order) => ({ businessDate: order.businessDate, total: calculateVegetableOrderTotal(order) }))
    .sort((left, right) => right.businessDate.localeCompare(left.businessDate));
}

export function findVendorPrimaryRate(rates: VendorItemRate[], vendorId: string | undefined, itemName: string, unit: VegetableOrderLine["unit"]): string | undefined {
  if (!vendorId) return undefined;
  const normalizedName = itemName.trim().toLocaleLowerCase("en-IN");
  return rates.find((rate) => rate.vendorId === vendorId && rate.unit === unit && rate.itemName.trim().toLocaleLowerCase("en-IN") === normalizedName)?.rate;
}

export function primaryRatesFromOrder(order: VegetableOrder): VendorItemRate[] {
  if (!order.vendorId) return [];
  return order.items.filter((line) => line.rate).map((line) => ({
    id: `${order.vendorId}-${line.name.trim().toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, "-")}-${line.unit}`,
    shopId: order.shopId,
    vendorId: order.vendorId!,
    itemName: line.name.trim(),
    unit: line.unit,
    rate: line.rate!,
    updatedAt: order.updatedAt,
  }));
}

export function calculateFinancialSnapshot(state: Pick<ShopState, "advancePayments" | "recurringRents">) {
  const advancesPaid = state.advancePayments.reduce((total, advance) => total.plus(advance.paidAmount), new Decimal(0));
  const advancesPending = state.advancePayments.reduce((total, advance) => total.plus(new Decimal(advance.totalAmount).minus(advance.paidAmount)), new Decimal(0));
  const monthlyRent = state.recurringRents.reduce((total, rent) => total.plus(rent.monthlyAmount), new Decimal(0));
  return { advancesPaid: money(advancesPaid), advancesPending: money(advancesPending), monthlyRent: money(monthlyRent) };
}

export function calculateCylinderDays(startedOn?: string, ranOutOn?: string, today?: string): number | undefined {
  if (!startedOn) return undefined;
  const end = ranOutOn ?? today;
  if (!end || end < startedOn) return undefined;
  const startDate = new Date(`${startedOn}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
}

export function calculateStaffSalary(dailyRate: string, fullDays: string, halfDays: string): string {
  return money(new Decimal(dailyRate).times(new Decimal(fullDays).plus(new Decimal(halfDays).dividedBy(2))));
}

export function calculateLpgPaymentSnapshot(state: Pick<ShopState, "advancePayments" | "lpgRefills">) {
  const cylinderAdvance = state.advancePayments.find((advance) => advance.id === "advance-cylinder")?.paidAmount ?? "0";
  const paidRefills = state.lpgRefills.filter((event) => event.paymentStatus === "Paid").reduce((total, event) => total.plus(event.amount), new Decimal(0));
  const dueRefills = state.lpgRefills.filter((event) => event.paymentStatus === "Due").reduce((total, event) => total.plus(event.amount), new Decimal(0));
  return { paid: money(new Decimal(cylinderAdvance).plus(paidRefills)), due: money(dueRefills), refillCount: state.lpgRefills.length };
}
