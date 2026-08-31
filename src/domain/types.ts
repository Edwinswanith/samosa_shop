export type Unit = "kg" | "g" | "l" | "ml" | "piece" | "packet" | "box" | "bottle" | "cylinder";
export type BaseUnit = "g" | "ml" | "piece" | "packet" | "box" | "bottle" | "cylinder";
export type PaymentMethod = "Cash" | "UPI" | "Credit";

export interface Item {
  id: string;
  name: string;
  category: string;
  defaultUnit: Unit;
  active: boolean;
  lowStockAt?: string;
}

export interface Product {
  id: string;
  name: string;
  defaultPrice: string;
  active: boolean;
  color: string;
}

export interface Vendor {
  id: string;
  name: string;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  note?: string;
}

export interface AuditFields {
  id: string;
  shopId: string;
  businessDate: string;
  createdAt: string;
  createdBy: string;
  idempotencyKey: string;
}

export interface InventoryTransaction extends AuditFields {
  kind: "inventory";
  itemId: string;
  transactionType: "purchase" | "consumption" | "waste" | "adjustment";
  enteredQuantity: string;
  enteredUnit: Unit;
  normalizedQuantity: string;
  normalizedUnit: BaseUnit;
  value: string;
  vendorId?: string;
  note?: string;
}

export interface SaleTransaction extends AuditFields {
  kind: "sale";
  productId: string;
  customerId?: string;
  channel: "Walk-in" | "University" | "Other";
  quantity: string;
  unitPrice: string;
  revenue: string;
  paymentMethod: PaymentMethod;
}

export interface ExpenseTransaction extends AuditFields {
  kind: "expense";
  expenseType?: "operating" | "investment";
  category: string;
  amount: string;
  paymentMethod: Exclude<PaymentMethod, "Credit">;
  note?: string;
}

export interface PaymentTransaction extends AuditFields {
  kind: "payment";
  customerId: string;
  amount: string;
  paymentMethod: Exclude<PaymentMethod, "Credit">;
  direction: "received" | "refunded";
  settlesThroughDate?: string;
  note?: string;
}

export type ShopTransaction = InventoryTransaction | SaleTransaction | ExpenseTransaction | PaymentTransaction;
type AuditKeys = "id" | "shopId" | "createdAt" | "createdBy" | "idempotencyKey";
export type NewShopTransaction = ShopTransaction extends infer Transaction
  ? Transaction extends ShopTransaction ? Omit<Transaction, AuditKeys> : never
  : never;

export interface LpgCylinder {
  id: string;
  code: string;
  supplier: string;
  status: "Booked" | "Available" | "In use" | "Empty";
  cost?: string;
  bookedOn: string;
  startedOn?: string;
  ranOutOn?: string;
}

export interface LpgPricing {
  initialCostPerCylinder: string;
  refillCost: string;
}

export interface LpgRefillEvent {
  id: string;
  cylinderId: string;
  ranOutOn: string;
  refilledOn: string;
  amount: string;
  paymentStatus: "Due" | "Paid";
  paidOn?: string;
  paymentMethod?: Exclude<PaymentMethod, "Credit">;
  previousStartedOn?: string;
  note?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  monthlySalary: string;
  advanceBalance: string;
  status: "Active" | "Inactive";
}

export interface VegetableOrderLine {
  id: string;
  name: string;
  quantity: string;
  unit: "kg" | "packet";
  rate?: string;
  amount?: string;
}

export interface VegetableOrder {
  id: string;
  shopId: string;
  businessDate: string;
  vendorId?: string;
  paymentStatus?: "Pending" | "Paid";
  paidOn?: string;
  items: VegetableOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorItemRate {
  id: string;
  shopId: string;
  vendorId: string;
  itemName: string;
  unit: "kg" | "packet";
  rate: string;
  updatedAt: string;
}

export interface AdvancePayment {
  id: string;
  label: string;
  paidAmount: string;
  totalAmount: string;
  note?: string;
}

export interface RecurringRent {
  id: string;
  label: string;
  monthlyAmount: string;
}

export interface DailyClosing {
  businessDate: string;
  status: "open" | "closed";
  countedCash?: string;
  note?: string;
  closedAt?: string;
}

export interface ShopState {
  items: Item[];
  products: Product[];
  vendors: Vendor[];
  customers: Customer[];
  vegetableOrders: VegetableOrder[];
  vendorItemRates: VendorItemRate[];
  advancePayments: AdvancePayment[];
  recurringRents: RecurringRent[];
  transactions: ShopTransaction[];
  cylinders: LpgCylinder[];
  lpgPricing: LpgPricing;
  lpgRefills: LpgRefillEvent[];
  staff: StaffMember[];
  closings: DailyClosing[];
}
