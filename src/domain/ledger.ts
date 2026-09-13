import Decimal from "decimal.js";
import { money } from "./decimal";
import type { ExpenseTransaction, InventoryTransaction, PaymentTransaction, SaleTransaction, ShopState, ShopTransaction } from "./types";
import { normalizeQuantity } from "./units";

const isInventory = (entry: ShopTransaction): entry is InventoryTransaction => entry.kind === "inventory";
const isSale = (entry: ShopTransaction): entry is SaleTransaction => entry.kind === "sale";
const isExpense = (entry: ShopTransaction): entry is ExpenseTransaction => entry.kind === "expense";
const isPayment = (entry: ShopTransaction): entry is PaymentTransaction => entry.kind === "payment";

export function calculateInventory(state: ShopState) {
  return state.items.map((item) => {
    const movements = state.transactions.filter(isInventory).filter((transaction) => transaction.itemId === item.id);
    const ledgerQuantity = movements.reduce((total, movement) => {
      const sign = movement.transactionType === "purchase" || movement.transactionType === "adjustment" ? 1 : -1;
      return total.plus(new Decimal(movement.normalizedQuantity).times(sign));
    }, new Decimal(0));
    const latest = movements.at(-1);
    const defaultBaseUnit = item.defaultUnit === "kg" ? "g" : item.defaultUnit === "l" ? "ml" : item.defaultUnit;
    const normalizedItemName = item.name.trim().toLocaleLowerCase("en-IN");
    const orderedQuantity = state.vegetableOrders.flatMap((order) => order.items)
      .filter((line) => line.name.trim().toLocaleLowerCase("en-IN") === normalizedItemName)
      .reduce((total, line) => {
        try {
          const normalized = normalizeQuantity(line.quantity, line.unit);
          return normalized.unit === defaultBaseUnit ? total.plus(normalized.quantity) : total;
        } catch {
          return total;
        }
      }, new Decimal(0));
    const quantity = ledgerQuantity.plus(orderedQuantity);
    return { itemId: item.id, quantity: quantity.toFixed(), unit: latest?.normalizedUnit ?? defaultBaseUnit };
  });
}

export function calculateReceivable(state: ShopState, customerId: string): string {
  const creditSales = state.transactions.filter(isSale)
    .filter((entry) => entry.customerId === customerId && entry.paymentMethod === "Credit")
    .reduce((total, entry) => total.plus(entry.revenue), new Decimal(0));
  const payments = state.transactions.filter(isPayment)
    .filter((entry) => entry.customerId === customerId)
    .reduce((total, entry) => total.plus(entry.direction === "received" ? entry.amount : `-${entry.amount}`), new Decimal(0));
  return money(creditSales.minus(payments));
}

export interface CustomerCreditRow {
  businessDate: string;
  invoiced: string;
  allocated: string;
  pending: string;
  status: "Paid" | "Partial" | "Pending";
}

export function calculateCustomerCreditStatus(state: ShopState, customerId: string) {
  const salesByDate = new Map<string, Decimal>();
  for (const sale of state.transactions.filter(isSale).filter((entry) => entry.customerId === customerId && entry.paymentMethod === "Credit")) {
    salesByDate.set(sale.businessDate, (salesByDate.get(sale.businessDate) ?? new Decimal(0)).plus(sale.revenue));
  }
  const received = state.transactions.filter(isPayment).filter((entry) => entry.customerId === customerId)
    .reduce((total, entry) => total.plus(entry.direction === "received" ? entry.amount : `-${entry.amount}`), new Decimal(0));
  let remainingReceipt = Decimal.max(received, 0);
  let paidThroughDate: string | undefined;
  let contiguous = true;
  const rows: CustomerCreditRow[] = [...salesByDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([businessDate, invoiced]) => {
    const allocated = Decimal.min(invoiced, remainingReceipt);
    remainingReceipt = remainingReceipt.minus(allocated);
    const pending = invoiced.minus(allocated);
    const status: CustomerCreditRow["status"] = pending.isZero() ? "Paid" : allocated.isZero() ? "Pending" : "Partial";
    if (contiguous && status === "Paid") paidThroughDate = businessDate;
    else contiguous = false;
    return { businessDate, invoiced: money(invoiced), allocated: money(allocated), pending: money(pending), status };
  });
  const invoiced = [...salesByDate.values()].reduce((total, amount) => total.plus(amount), new Decimal(0));
  return { invoiced: money(invoiced), paid: money(Decimal.min(Decimal.max(received, 0), invoiced)), pending: money(Decimal.max(invoiced.minus(received), 0)), paidThroughDate, rows };
}

export function calculateSettlementAmountThroughDate(state: ShopState, customerId: string, throughDate: string) {
  const status = calculateCustomerCreditStatus(state, customerId);
  return money(status.rows.filter((row) => row.businessDate <= throughDate).reduce((total, row) => total.plus(row.pending), new Decimal(0)));
}

export function calculateDashboard(state: ShopState, businessDate: string) {
  const day = state.transactions.filter((entry) => entry.businessDate === businessDate);
  const sales = day.filter(isSale);
  const revenue = sales.reduce((total, entry) => total.plus(entry.revenue), new Decimal(0));
  const cashExpenses = day
    .filter(isExpense)
    .reduce((total, entry) => total.plus(entry.amount), new Decimal(0));
  const operatingExpenses = day
    .filter(isExpense).filter((entry) => entry.expenseType !== "investment")
    .reduce((total, entry) => total.plus(entry.amount), new Decimal(0));
  const purchases = day
    .filter(isInventory).filter((entry) => entry.transactionType === "purchase")
    .reduce((total, entry) => total.plus(entry.value), new Decimal(0));
  const materialsConsumed = day
    .filter(isInventory).filter((entry) => ["consumption", "waste"].includes(entry.transactionType))
    .reduce((total, entry) => total.plus(entry.value), new Decimal(0));
  const walkInReceipts = sales
    .filter((entry) => entry.paymentMethod !== "Credit")
    .reduce((total, entry) => total.plus(entry.revenue), new Decimal(0));
  const customerReceipts = day
    .filter(isPayment).filter((entry) => entry.direction === "received")
    .reduce((total, entry) => total.plus(entry.amount), new Decimal(0));
  const productQuantities = sales.reduce<Record<string, Decimal>>((totals, sale) => ({
    ...totals,
    [sale.productId]: (totals[sale.productId] ?? new Decimal(0)).plus(sale.quantity),
  }), {});

  return {
    revenue: money(revenue),
    purchases: money(purchases),
    expenses: money(operatingExpenses),
    materialsConsumed: money(materialsConsumed),
    unitsSold: sales.reduce((total, sale) => total.plus(sale.quantity), new Decimal(0)).toFixed(),
    cashFlow: money(walkInReceipts.plus(customerReceipts).minus(purchases).minus(cashExpenses)),
    estimatedProfit: money(revenue.minus(materialsConsumed).minus(operatingExpenses)),
    productQuantities: Object.fromEntries(Object.entries(productQuantities).map(([id, value]) => [id, value.toFixed()])),
  };
}

export interface DailySalesSummary {
  businessDate: string;
  samosaQuantity: string;
  samosaRevenue: string;
  kathiRollQuantity: string;
  kathiRollRevenue: string;
  revenue: string;
}

export function calculatePeriodSummary(state: ShopState, from?: string, to?: string) {
  const inRange = state.transactions.filter((entry) =>
    (!from || entry.businessDate >= from) && (!to || entry.businessDate <= to),
  );
  const sales = inRange.filter(isSale);
  const purchases = inRange.filter(isInventory).filter((entry) => entry.transactionType === "purchase");
  const expenses = inRange.filter(isExpense);
  const revenue = sales.reduce((total, entry) => total.plus(entry.revenue), new Decimal(0));
  const spending = purchases.reduce((total, entry) => total.plus(entry.value), new Decimal(0))
    .plus(expenses.reduce((total, entry) => total.plus(entry.amount), new Decimal(0)));

  const grouped = new Map<string, {
    samosaQuantity: Decimal; samosaRevenue: Decimal;
    kathiRollQuantity: Decimal; kathiRollRevenue: Decimal; revenue: Decimal;
  }>();
  for (const sale of sales) {
    const day = grouped.get(sale.businessDate) ?? {
      samosaQuantity: new Decimal(0), samosaRevenue: new Decimal(0),
      kathiRollQuantity: new Decimal(0), kathiRollRevenue: new Decimal(0), revenue: new Decimal(0),
    };
    if (sale.productId === "samosa") {
      day.samosaQuantity = day.samosaQuantity.plus(sale.quantity);
      day.samosaRevenue = day.samosaRevenue.plus(sale.revenue);
    }
    if (sale.productId === "kathi-roll") {
      day.kathiRollQuantity = day.kathiRollQuantity.plus(sale.quantity);
      day.kathiRollRevenue = day.kathiRollRevenue.plus(sale.revenue);
    }
    day.revenue = day.revenue.plus(sale.revenue);
    grouped.set(sale.businessDate, day);
  }

  const dailySales: DailySalesSummary[] = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([businessDate, day]) => ({
      businessDate,
      samosaQuantity: day.samosaQuantity.toFixed(),
      samosaRevenue: money(day.samosaRevenue),
      kathiRollQuantity: day.kathiRollQuantity.toFixed(),
      kathiRollRevenue: money(day.kathiRollRevenue),
      revenue: money(day.revenue),
    }));

  return {
    revenue: money(revenue),
    spending: money(spending),
    profit: money(revenue.minus(spending)),
    unitsSold: sales.reduce((total, sale) => total.plus(sale.quantity), new Decimal(0)).toFixed(),
    dailySales,
  };
}
