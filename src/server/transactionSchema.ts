import { z } from "zod";

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, "Use a decimal string");
const common = {
  id: z.string().min(1), shopId: z.string().min(1), businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string().datetime(), createdBy: z.string().min(1), idempotencyKey: z.string().min(1),
};

export const transactionSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("sale"), productId: z.string(), customerId: z.string().optional(), channel: z.enum(["Walk-in", "University", "Other"]), quantity: decimalString, unitPrice: decimalString, revenue: decimalString, paymentMethod: z.enum(["Cash", "UPI", "Credit"]) }),
  z.object({ ...common, kind: z.literal("inventory"), itemId: z.string(), transactionType: z.enum(["purchase", "consumption", "waste", "adjustment"]), enteredQuantity: decimalString, enteredUnit: z.enum(["kg", "g", "l", "ml", "piece", "packet", "box", "bottle", "cylinder"]), normalizedQuantity: decimalString, normalizedUnit: z.enum(["g", "ml", "piece", "packet", "box", "bottle", "cylinder"]), value: decimalString, vendorId: z.string().optional(), note: z.string().max(500).optional() }),
  z.object({ ...common, kind: z.literal("expense"), expenseType: z.enum(["operating", "investment"]).optional(), category: z.string().min(1), amount: decimalString, paymentMethod: z.enum(["Cash", "UPI"]), note: z.string().max(500).optional() }),
  z.object({ ...common, kind: z.literal("payment"), customerId: z.string(), amount: decimalString, paymentMethod: z.enum(["Cash", "UPI"]), direction: z.enum(["received", "refunded"]), settlesThroughDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), note: z.string().max(500).optional() }),
]);
