import type { Customer } from "./types";

export const vitCustomerAccounts: Customer[] = [
  { id: "university", name: "VIT E Block Hostel", note: "Existing VIT credit account" },
  { id: "vit-canteen", name: "VIT Canteen", note: "Separate VIT canteen credit account" },
];

export function mergeCustomerAccounts(customers: Customer[] = []): Customer[] {
  const canonicalIds = new Set(vitCustomerAccounts.map((customer) => customer.id));
  const otherCustomers = customers.filter((customer) => !canonicalIds.has(customer.id));
  return [...vitCustomerAccounts, ...otherCustomers];
}
