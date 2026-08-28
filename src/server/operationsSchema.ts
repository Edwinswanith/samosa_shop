import { z } from "zod";

const decimalString = z.string().regex(/^\d+(\.\d+)?$/, "Use a positive decimal number");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const vegetableOrderSchema = z.object({
  id: z.string().min(1),
  shopId: z.string().min(1),
  businessDate: dateString,
  vendorId: z.string().min(1).optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    quantity: decimalString,
    unit: z.enum(["kg", "packet"]),
    rate: decimalString.optional(),
    amount: decimalString.optional(),
  })).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const vendorItemRateSchema = z.object({
  id: z.string().min(1), shopId: z.string().min(1), vendorId: z.string().min(1),
  itemName: z.string().trim().min(1).max(80), unit: z.enum(["kg", "packet"]), rate: decimalString, updatedAt: z.string().datetime(),
});

export const lpgCylinderSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1).max(40),
  supplier: z.string().trim().max(80),
  status: z.enum(["Booked", "Available", "In use", "Empty"]),
  cost: decimalString.optional(),
  bookedOn: dateString,
  startedOn: dateString.optional(),
  ranOutOn: dateString.optional(),
});

export const staffMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  monthlySalary: decimalString,
  advanceBalance: decimalString,
  status: z.enum(["Active", "Inactive"]),
});

export const advancePaymentSchema = z.object({
  id: z.string().min(1), label: z.string().trim().min(1).max(80),
  paidAmount: decimalString, totalAmount: decimalString, note: z.string().trim().max(160).optional(),
}).refine((value) => Number(value.totalAmount) >= Number(value.paidAmount), { message: "Total cannot be less than paid amount", path: ["totalAmount"] });

export const recurringRentSchema = z.object({
  id: z.string().min(1), label: z.string().trim().min(1).max(80), monthlyAmount: decimalString,
});

export const lpgPricingSchema = z.object({ initialCostPerCylinder: decimalString, refillCost: decimalString });

export const lpgRefillEventSchema = z.object({
  id: z.string().min(1), cylinderId: z.string().min(1), ranOutOn: dateString, refilledOn: dateString,
  amount: decimalString, paymentStatus: z.enum(["Due", "Paid"]), paidOn: dateString.optional(),
  paymentMethod: z.enum(["Cash", "UPI"]).optional(), previousStartedOn: dateString.optional(), note: z.string().trim().max(200).optional(),
}).superRefine((value, context) => {
  if (value.paymentStatus === "Paid" && !value.paidOn) context.addIssue({ code: "custom", path: ["paidOn"], message: "Paid date is required" });
});

export const operationMutationSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("vegetableOrder"), data: vegetableOrderSchema, setAsPrimaryRates: z.boolean().optional() }),
  z.object({ entity: z.literal("vendorItemRate"), data: vendorItemRateSchema }),
  z.object({ entity: z.literal("lpgCylinder"), data: lpgCylinderSchema }),
  z.object({ entity: z.literal("staffMember"), data: staffMemberSchema }),
  z.object({ entity: z.literal("advancePayment"), data: advancePaymentSchema }),
  z.object({ entity: z.literal("recurringRent"), data: recurringRentSchema }),
  z.object({ entity: z.literal("lpgPricing"), data: lpgPricingSchema }),
  z.object({ entity: z.literal("lpgRefillEvent"), data: lpgRefillEventSchema }),
]);
