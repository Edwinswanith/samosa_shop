import type { ShopTransaction } from "./types";

function escapeCsv(value: string) {
  return value.includes(",") || value.includes("\"") || value.includes("\n") ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

export function transactionsToCsv(transactions: ShopTransaction[]): string {
  const header = "businessDate,kind,reference,quantity,unit,amount,paymentMethod";
  const rows = transactions.map((entry) => {
    const reference = entry.kind === "sale" ? entry.productId : entry.kind === "inventory" ? entry.itemId : entry.kind === "payment" ? entry.customerId : entry.category;
    const quantity = entry.kind === "sale" ? entry.quantity : entry.kind === "inventory" ? entry.enteredQuantity : "";
    const unit = entry.kind === "inventory" ? entry.enteredUnit : entry.kind === "sale" ? "piece" : "";
    const amount = entry.kind === "sale" ? entry.revenue : entry.kind === "inventory" ? entry.value : entry.amount;
    const paymentMethod = entry.kind === "inventory" ? "" : entry.paymentMethod;
    return [entry.businessDate, entry.kind, reference, quantity, unit, amount, paymentMethod].map((value) => escapeCsv(String(value))).join(",");
  });
  return [header, ...rows].join("\n");
}

export function downloadTransactionsCsv(transactions: ShopTransaction[]) {
  const blob = new Blob([transactionsToCsv(transactions)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "samosa-shop-transactions.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
