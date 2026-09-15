import { NextResponse } from "next/server";
import { operationMutationSchema } from "@/server/operationsSchema";
import { deleteVegetableOrder, listOperations, saveAdvancePayment, saveCustomer, saveCylinder, saveLpgPricing, saveLpgRefillEvent, saveRecurringRent, saveStaffMember, saveStaffPayment, saveVegetableOrder, saveVendorItemRate } from "@/server/operationsRepository";

function unavailable() {
  return NextResponse.json({ success: false, error: "The operations store is unavailable" }, { status: 503 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await listOperations() });
  } catch { return unavailable(); }
}

export async function PUT(request: Request) {
  const parsed = operationMutationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    const result = parsed.data.entity === "customer" ? await saveCustomer(parsed.data.data)
      : parsed.data.entity === "vegetableOrder" ? await saveVegetableOrder(parsed.data.data, parsed.data.setAsPrimaryRates)
      : parsed.data.entity === "vendorItemRate" ? await saveVendorItemRate(parsed.data.data)
      : parsed.data.entity === "lpgCylinder" ? await saveCylinder(parsed.data.data)
      : parsed.data.entity === "staffMember" ? await saveStaffMember(parsed.data.data)
      : parsed.data.entity === "staffPayment" ? await saveStaffPayment(parsed.data.data)
      : parsed.data.entity === "advancePayment" ? await saveAdvancePayment(parsed.data.data)
      : parsed.data.entity === "recurringRent" ? await saveRecurringRent(parsed.data.data)
      : parsed.data.entity === "lpgPricing" ? await saveLpgPricing(parsed.data.data)
      : await saveLpgRefillEvent(parsed.data.data);
    return NextResponse.json({ success: true, data: result });
  } catch { return unavailable(); }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "Order id is required" }, { status: 400 });
  try {
    await deleteVegetableOrder(id);
    return NextResponse.json({ success: true });
  } catch { return unavailable(); }
}
