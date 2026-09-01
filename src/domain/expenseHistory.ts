import Decimal from "decimal.js";
import { money } from "./decimal";
import { calculateVegetableLineAmount, getVegetablePaymentStatus } from "./operations";
import type { ShopState } from "./types";

export type ExpenseHistoryKind = "purchase" | "operating" | "investment" | "vegetable" | "salary" | "lpg";

export interface DailyExpenseItem {
  id: string;
  businessDate: string;
  label: string;
  detail: string;
  category: string;
  amount: string;
  status: "Paid" | "Pending";
  kind: ExpenseHistoryKind;
}

export interface DailyExpenseGroup {
  businessDate: string;
  items: DailyExpenseItem[];
  total: string;
  paid: string;
  pending: string;
}

export function calculateExpenseHistoryTotal(groups: DailyExpenseGroup[]): string {
  return money(groups.reduce((total, group) => total.plus(group.total), new Decimal(0)));
}

function hasMatchingLpgExpense(state: ShopState, refillId: string, businessDate: string, amount: string) {
  return state.transactions.some((transaction) => transaction.kind === "expense"
    && transaction.businessDate === businessDate
    && (transaction.note?.includes(refillId)
      || (transaction.category.toLocaleLowerCase("en-IN").includes("lpg") && money(transaction.amount) === money(amount))));
}

export function buildDailyExpenseHistory(state: ShopState): DailyExpenseGroup[] {
  const items: DailyExpenseItem[] = [];

  for (const transaction of state.transactions) {
    if (transaction.kind === "expense") {
      items.push({
        id: transaction.id,
        businessDate: transaction.businessDate,
        label: transaction.category,
        detail: transaction.note || (transaction.expenseType === "investment" ? "Long-term shop investment" : `${transaction.paymentMethod} expense`),
        category: transaction.expenseType === "investment" ? "Investment" : "Expense",
        amount: money(transaction.amount),
        status: "Paid",
        kind: transaction.expenseType === "investment" ? "investment" : "operating",
      });
    }
    if (transaction.kind === "inventory" && transaction.transactionType === "purchase") {
      const stockItem = state.items.find((candidate) => candidate.id === transaction.itemId);
      items.push({
        id: transaction.id,
        businessDate: transaction.businessDate,
        label: stockItem?.name ?? transaction.itemId,
        detail: transaction.note || `${transaction.enteredQuantity} ${transaction.enteredUnit} purchased`,
        category: "Purchase",
        amount: money(transaction.value),
        status: "Paid",
        kind: "purchase",
      });
    }
  }

  for (const order of state.vegetableOrders) {
    const vendor = state.vendors.find((candidate) => candidate.id === order.vendorId)?.name ?? "Vegetable vendor";
    const status = getVegetablePaymentStatus(order) === "Paid" ? "Paid" : "Pending";
    for (const line of order.items) {
      const amount = calculateVegetableLineAmount(line);
      if (!amount) continue;
      items.push({
        id: `${order.id}:${line.id}`,
        businessDate: order.businessDate,
        label: line.name,
        detail: `${line.quantity} ${line.unit} · ${vendor}`,
        category: "Vegetables",
        amount,
        status,
        kind: "vegetable",
      });
    }
  }

  for (const payment of state.staffPayments) {
    const member = state.staff.find((candidate) => candidate.id === payment.staffId);
    items.push({
      id: payment.id,
      businessDate: payment.businessDate,
      label: `${member?.name ?? "Staff"} salary`,
      detail: `${payment.periodStart} to ${payment.periodEnd} · ${payment.fullDays} full + ${payment.halfDays} half-day`,
      category: "Payroll",
      amount: money(payment.amount),
      status: "Paid",
      kind: "salary",
    });
  }

  for (const refill of state.lpgRefills) {
    if (hasMatchingLpgExpense(state, refill.id, refill.refilledOn, refill.amount)) continue;
    const cylinder = state.cylinders.find((candidate) => candidate.id === refill.cylinderId);
    items.push({
      id: refill.id,
      businessDate: refill.refilledOn,
      label: "LPG refill",
      detail: `${cylinder?.code ?? refill.cylinderId} · cylinder lifecycle`,
      category: "Fuel",
      amount: money(refill.amount),
      status: refill.paymentStatus === "Paid" ? "Paid" : "Pending",
      kind: "lpg",
    });
  }

  const grouped = new Map<string, DailyExpenseItem[]>();
  for (const item of items) grouped.set(item.businessDate, [...(grouped.get(item.businessDate) ?? []), item]);

  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([businessDate, dayItems]) => {
      const total = dayItems.reduce((sum, item) => sum.plus(item.amount), new Decimal(0));
      const paid = dayItems.filter((item) => item.status === "Paid").reduce((sum, item) => sum.plus(item.amount), new Decimal(0));
      return { businessDate, items: dayItems, total: money(total), paid: money(paid), pending: money(total.minus(paid)) };
    });
}
