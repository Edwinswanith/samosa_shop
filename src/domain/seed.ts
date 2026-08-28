import type { InventoryTransaction, PaymentTransaction, SaleTransaction, ShopState } from "./types";

const base = {
  shopId: "main-shop",
  createdAt: "2026-08-27T06:30:00.000Z",
  createdBy: "owner",
};

function inventory(id: string, itemId: string, transactionType: InventoryTransaction["transactionType"], quantity: string, value: string): InventoryTransaction {
  return { ...base, id, idempotencyKey: id, businessDate: "2026-08-27", kind: "inventory", itemId, transactionType, enteredQuantity: quantity, enteredUnit: itemId === "oil" ? "l" : "kg", normalizedQuantity: itemId === "oil" ? String(Number(quantity) * 1000) : String(Number(quantity) * 1000), normalizedUnit: itemId === "oil" ? "ml" : "g", value };
}

function sale(id: string, productId: string, channel: SaleTransaction["channel"], quantity: string, unitPrice: string, paymentMethod: SaleTransaction["paymentMethod"], customerId?: string): SaleTransaction {
  return { ...base, id, idempotencyKey: id, businessDate: "2026-08-27", kind: "sale", productId, channel, quantity, unitPrice, revenue: String(Number(quantity) * Number(unitPrice)), paymentMethod, customerId };
}

function payment(id: string, businessDate: string, amount: string): PaymentTransaction {
  return { ...base, id, idempotencyKey: id, businessDate, kind: "payment", customerId: "university", amount, paymentMethod: "UPI", direction: "received" };
}

export function createDemoState(): ShopState {
  return {
    items: [
      { id: "potato", name: "Potato", category: "Vegetables", defaultUnit: "kg", active: true, lowStockAt: "5000" },
      { id: "onion", name: "Onion", category: "Vegetables", defaultUnit: "kg", active: true, lowStockAt: "3000" },
      { id: "oil", name: "Sunflower oil", category: "Cooking", defaultUnit: "l", active: true, lowStockAt: "5000" },
      { id: "dalda", name: "Dalda", category: "Cooking fat", defaultUnit: "kg", active: true, lowStockAt: "3000" },
      { id: "peanut", name: "Peanut", category: "Ingredients", defaultUnit: "kg", active: true, lowStockAt: "1000" },
      { id: "maida", name: "Maida", category: "Flour", defaultUnit: "kg", active: true, lowStockAt: "4000" },
      { id: "mayonnaise", name: "Mayonnaise", category: "Sauces", defaultUnit: "kg", active: true, lowStockAt: "1000" },
      { id: "wrap", name: "Kathi roll wrap", category: "Ingredients", defaultUnit: "packet", active: true, lowStockAt: "3" },
      { id: "malabar-paratha", name: "Malabar paratha", category: "Ready-made breads", defaultUnit: "piece", active: true, lowStockAt: "10" },
      { id: "chicken", name: "Chicken", category: "Kathi roll ingredients", defaultUnit: "kg", active: true, lowStockAt: "1000" },
      { id: "chilli-sauce", name: "Chilli sauce", category: "Sauces", defaultUnit: "bottle", active: true, lowStockAt: "1" },
      { id: "soy-sauce", name: "Soy sauce", category: "Sauces", defaultUnit: "bottle", active: true, lowStockAt: "1" },
      { id: "pepper", name: "Pepper", category: "Spices", defaultUnit: "kg", active: true, lowStockAt: "500" },
      { id: "cabbage", name: "Cabbage", category: "Vegetables", defaultUnit: "kg", active: true },
      { id: "carrot", name: "Carrot", category: "Vegetables", defaultUnit: "kg", active: true },
      { id: "bell-pepper", name: "Bell pepper", category: "Vegetables", defaultUnit: "kg", active: true },
      { id: "beans", name: "Beans", category: "Vegetables", defaultUnit: "kg", active: true },
      { id: "tomato", name: "Tomato", category: "Vegetables", defaultUnit: "kg", active: true },
      { id: "brinjal", name: "Brinjal", category: "Vegetables", defaultUnit: "kg", active: true },
      { id: "coriander", name: "Coriander", category: "Vegetables", defaultUnit: "packet", active: true },
    ],
    products: [
      { id: "samosa", name: "Samosa", defaultPrice: "14.00", active: true, color: "#c8672a" },
      { id: "kathi-roll", name: "Kathi roll", defaultPrice: "65.00", active: true, color: "#61764b" },
    ],
    vendors: [
      { id: "ravi", name: "Ravi Vegetables", note: "Morning delivery" },
      { id: "metro-oil", name: "Metro Oil Store" },
    ],
    customers: [{ id: "university", name: "VIT", note: "Weekly settlement" }],
    vegetableOrders: [
      { id: "vegetables-2026-08-24", shopId: "main-shop", businessDate: "2026-08-24", vendorId: "ravi", createdAt: "2026-08-24T06:30:00.000Z", updatedAt: "2026-08-24T06:30:00.000Z", items: [
        { id: "potato", name: "Potato", quantity: "20", unit: "kg" }, { id: "cabbage", name: "Cabbage", quantity: "5", unit: "kg" }, { id: "carrot", name: "Carrot", quantity: "0.5", unit: "kg" }, { id: "bell-pepper", name: "Bell pepper", quantity: "0.5", unit: "kg" },
      ] },
      { id: "vegetables-2026-08-25", shopId: "main-shop", businessDate: "2026-08-25", vendorId: "ravi", createdAt: "2026-08-25T06:30:00.000Z", updatedAt: "2026-08-25T06:30:00.000Z", items: [
        { id: "potato", name: "Potato", quantity: "15", unit: "kg" }, { id: "cabbage", name: "Cabbage", quantity: "5", unit: "kg" },
      ] },
      { id: "vegetables-2026-08-26", shopId: "main-shop", businessDate: "2026-08-26", vendorId: "ravi", createdAt: "2026-08-26T06:30:00.000Z", updatedAt: "2026-08-26T06:30:00.000Z", items: [
        { id: "potato", name: "Potato", quantity: "10", unit: "kg" }, { id: "carrot", name: "Carrot", quantity: "0.5", unit: "kg" }, { id: "beans", name: "Beans", quantity: "0.5", unit: "kg" }, { id: "onion", name: "Onion", quantity: "1", unit: "kg" }, { id: "tomato", name: "Tomato", quantity: "1", unit: "kg" },
      ] },
      { id: "vegetables-2026-08-27", shopId: "main-shop", businessDate: "2026-08-27", vendorId: "ravi", createdAt: "2026-08-27T06:30:00.000Z", updatedAt: "2026-08-27T06:30:00.000Z", items: [
        { id: "potato", name: "Potato", quantity: "20", unit: "kg" }, { id: "cabbage", name: "Cabbage", quantity: "4", unit: "kg" }, { id: "carrot", name: "Carrot", quantity: "0.5", unit: "kg" }, { id: "bell-pepper", name: "Bell pepper", quantity: "0.5", unit: "kg" }, { id: "brinjal", name: "Brinjal", quantity: "0.5", unit: "kg" }, { id: "coriander", name: "Coriander", quantity: "1", unit: "packet" },
      ] },
    ],
    vendorItemRates: [
      { id: "ravi-potato-kg", shopId: "main-shop", vendorId: "ravi", itemName: "Potato", unit: "kg", rate: "25.00", updatedAt: "2026-08-27T08:00:00.000Z" },
      { id: "ravi-cabbage-kg", shopId: "main-shop", vendorId: "ravi", itemName: "Cabbage", unit: "kg", rate: "28.00", updatedAt: "2026-08-27T08:00:00.000Z" },
      { id: "ravi-carrot-kg", shopId: "main-shop", vendorId: "ravi", itemName: "Carrot", unit: "kg", rate: "100.00", updatedAt: "2026-08-27T08:00:00.000Z" },
      { id: "ravi-bell-pepper-kg", shopId: "main-shop", vendorId: "ravi", itemName: "Bell pepper", unit: "kg", rate: "40.00", updatedAt: "2026-08-27T08:00:00.000Z" },
      { id: "ravi-brinjal-kg", shopId: "main-shop", vendorId: "ravi", itemName: "Brinjal", unit: "kg", rate: "50.00", updatedAt: "2026-08-27T08:00:00.000Z" },
      { id: "ravi-coriander-packet", shopId: "main-shop", vendorId: "ravi", itemName: "Coriander", unit: "packet", rate: "10.00", updatedAt: "2026-08-27T08:00:00.000Z" },
    ],
    advancePayments: [
      { id: "advance-shop", label: "Shop", paidAmount: "50000.00", totalAmount: "75000.00", note: "₹25,000 pending" },
      { id: "advance-house", label: "House", paidAmount: "10000.00", totalAmount: "10000.00" },
      { id: "advance-cylinder", label: "Cylinder", paidAmount: "4000.00", totalAmount: "4000.00", note: "Two cylinders" },
      { id: "advance-water", label: "Water", paidAmount: "450.00", totalAmount: "450.00", note: "Three water cans" },
    ],
    recurringRents: [
      { id: "rent-shop", label: "Shop rent", monthlyAmount: "7000.00" },
      { id: "rent-house", label: "House rent", monthlyAmount: "5000.00" },
    ],
    transactions: [
      inventory("p-potato", "potato", "purchase", "15.5", "465.00"),
      inventory("c-potato", "potato", "consumption", "3.4", "951.50"),
      inventory("w-potato", "potato", "waste", "0.5", "140.00"),
      inventory("p-onion", "onion", "purchase", "3.25", "136.50"),
      inventory("c-onion", "onion", "consumption", "1.2", "220.00"),
      inventory("p-oil", "oil", "purchase", "5", "695.00"),
      inventory("c-oil", "oil", "consumption", "2", "200.00"),
      { ...sale("samosa-2026-08-21", "samosa", "University", "30", "14", "Credit", "university"), businessDate: "2026-08-21" },
      { ...sale("samosa-2026-08-24", "samosa", "University", "350", "14", "Credit", "university"), businessDate: "2026-08-24" },
      { ...sale("samosa-2026-08-25", "samosa", "University", "406", "14", "Credit", "university"), businessDate: "2026-08-25" },
      { ...sale("samosa-2026-08-26", "samosa", "University", "204", "14", "Credit", "university"), businessDate: "2026-08-26" },
      sale("samosa-2026-08-27", "samosa", "University", "400", "14", "Credit", "university"),
      sale("kathi-roll-2026-08-27", "kathi-roll", "University", "10", "65", "Credit", "university"),
      { ...base, id: "e-1", idempotencyKey: "e-1", businessDate: "2026-08-27", kind: "expense", category: "Labour", amount: "900.00", paymentMethod: "Cash", note: "Daily helpers" },
      { ...base, id: "investment-stand-rack-2026-08-27", idempotencyKey: "investment-stand-rack-2026-08-27", businessDate: "2026-08-27", createdAt: "2026-08-27T11:45:00.000Z", kind: "expense", expenseType: "investment", category: "Equipment investment", amount: "6920.00", paymentMethod: "Cash", note: "Stand and rack" },
      { ...base, id: "investment-mixture-2026-08-27", idempotencyKey: "investment-mixture-2026-08-27", businessDate: "2026-08-27", createdAt: "2026-08-27T12:00:00.000Z", kind: "expense", expenseType: "investment", category: "Equipment investment", amount: "1500.00", paymentMethod: "Cash", note: "Mixture asset" },
      payment("pay-old", "2026-08-25", "5773.50"),
      payment("pay-today", "2026-08-27", "4226.50"),
    ],
    cylinders: [
      { id: "lpg-001", code: "LPG-001", supplier: "", status: "In use", bookedOn: "2026-08-24", startedOn: "2026-08-24" },
      { id: "lpg-002", code: "LPG-002", supplier: "", status: "Available", bookedOn: "2026-08-24" },
    ],
    lpgPricing: { initialCostPerCylinder: "4600.00", refillCost: "2600.00" },
    lpgRefills: [],
    staff: [
      { id: "helper-1", name: "Kumar", monthlySalary: "15000.00", advanceBalance: "3000.00", status: "Active" },
      { id: "helper-2", name: "Selvi", monthlySalary: "12000.00", advanceBalance: "0.00", status: "Active" },
    ],
    closings: [{ businessDate: "2026-08-27", status: "open" }],
  };
}
