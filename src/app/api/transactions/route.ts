import { NextResponse } from "next/server";
import { transactionSchema } from "@/server/transactionSchema";
import { createTransaction, listTransactions } from "@/server/transactionRepository";

function unavailable(error: unknown) {
  const message = error instanceof Error && error.message.includes("MONGODB_URI") ? "MongoDB is not configured" : "The transaction store is unavailable";
  return NextResponse.json({ success: false, error: message }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shopId = url.searchParams.get("shopId") ?? "main-shop";
    return NextResponse.json({ success: true, data: await listTransactions(shopId) });
  } catch (error) { return unavailable(error); }
}

export async function POST(request: Request) {
  const parsed = transactionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ success: true, data: await createTransaction(parsed.data) }, { status: 201 });
  } catch (error) { return unavailable(error); }
}
