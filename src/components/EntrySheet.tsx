"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, IndianRupee, X } from "lucide-react";
import { calculateLineAmount, deriveRate } from "@/domain/decimal";
import type { PaymentMethod, Unit } from "@/domain/types";
import { availableUnits, normalizeQuantity } from "@/domain/units";
import { currentBusinessDate } from "@/lib/date";
import { useShopStore } from "@/store/ShopStore";

type EntryType = "Sale" | "Purchase" | "Consumption" | "Expense" | "Waste" | "LPG";
const entryTypes: EntryType[] = ["Sale", "Purchase", "Consumption", "Expense", "Waste", "LPG"];

export function EntrySheet({ onClose }: { onClose: () => void }) {
  const { state, addTransaction, updateCylinder } = useShopStore();
  const [entryType, setEntryType] = useState<EntryType>("Sale");
  const [saved, setSaved] = useState(false);
  const [date, setDate] = useState(currentBusinessDate());
  const [productId, setProductId] = useState(state.products[0]?.id ?? "");
  const [itemId, setItemId] = useState(state.items[0]?.id ?? "");
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>(state.items[0]?.defaultUnit ?? "kg");
  const [price, setPrice] = useState(state.products[0]?.defaultPrice ?? "20");
  const [total, setTotal] = useState("");
  const [channel, setChannel] = useState<"Walk-in" | "University" | "Other">("Walk-in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [category, setCategory] = useState("Labour");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const calculatedTotal = useMemo(() => {
    try { return total || calculateLineAmount(quantity || "0", price || "0"); } catch { return "0.00"; }
  }, [price, quantity, total]);

  function chooseItem(nextItemId: string) {
    setItemId(nextItemId);
    const item = state.items.find((candidate) => candidate.id === nextItemId);
    if (item) setUnit(item.defaultUnit);
  }

  function resetAndCelebrate() {
    setSaved(true);
    window.setTimeout(() => onClose(), 650);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
    if (entryType === "Sale") {
      await addTransaction({
        kind: "sale", businessDate: date, productId,
        customerId: channel === "University" ? "university" : undefined,
        channel, quantity, unitPrice: price, revenue: calculateLineAmount(quantity, price), paymentMethod,
      });
    } else if (entryType === "Expense") {
      await addTransaction({ kind: "expense", expenseType: category === "Equipment investment" ? "investment" : "operating", businessDate: date, category, amount: calculatedTotal, paymentMethod: paymentMethod === "UPI" ? "UPI" : "Cash", note });
    } else if (entryType === "LPG") {
      const cylinder = state.cylinders[0];
      if (cylinder) await updateCylinder(cylinder.id, { status: "Empty", ranOutOn: date });
    } else {
      const normalized = normalizeQuantity(quantity, unit);
      const transactionType = entryType === "Purchase" ? "purchase" : entryType === "Waste" ? "waste" : "consumption";
      await addTransaction({
        kind: "inventory", businessDate: date, itemId, transactionType,
        enteredQuantity: quantity, enteredUnit: unit,
        normalizedQuantity: normalized.quantity, normalizedUnit: normalized.unit,
        value: calculatedTotal, vendorId: entryType === "Purchase" ? vendorId : undefined, note,
      });
    }
    resetAndCelebrate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The entry could not be saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sheetBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="entrySheet" role="dialog" aria-modal="true" aria-label="New shop entry">
        <header className="sheetHeader">
          <div><span className="eyebrow">Quick capture</span><h2>What happened?</h2></div>
          <button className="iconButton" aria-label="Close entry" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="entryTypeRail" aria-label="Entry type">
          {entryTypes.map((type) => <button key={type} className={entryType === type ? "active" : ""} onClick={() => setEntryType(type)}>{type}</button>)}
        </div>

        {saved ? <div className="savedState"><span><Check size={30} /></span><h3>Entry saved</h3><p>The ledgers have been updated.</p></div> : (
          <form className="entryForm" onSubmit={submit}>
            <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>

            {entryType === "Sale" && <>
              <label>Product<select value={productId} onChange={(event) => { setProductId(event.target.value); const product = state.products.find((p) => p.id === event.target.value); if (product) setPrice(product.defaultPrice); }}>{state.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              <div className="fieldPair"><label>Quantity<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label><label>Price each<div className="moneyInput"><IndianRupee size={16} /><input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} required /></div></label></div>
              <label>Channel<select value={channel} onChange={(event) => { const next = event.target.value as typeof channel; setChannel(next); setPaymentMethod(next === "University" ? "Credit" : "Cash"); }}>{["Walk-in", "University", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
            </>}

            {["Purchase", "Consumption", "Waste"].includes(entryType) && <>
              <label>Item<select value={itemId} onChange={(event) => chooseItem(event.target.value)}>{state.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {entryType === "Purchase" && <label>Vendor<select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>{state.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>}
              <div className="fieldPair"><label>Quantity<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label><label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>{availableUnits.map((value) => <option key={value}>{value}</option>)}</select></label></div>
              <div className="fieldPair"><label>Rate / unit<div className="moneyInput"><IndianRupee size={16} /><input inputMode="decimal" value={price} onChange={(event) => { setPrice(event.target.value); setTotal(""); }} /></div></label><label>Total amount<div className="moneyInput"><IndianRupee size={16} /><input inputMode="decimal" value={total} placeholder={calculatedTotal} onChange={(event) => { setTotal(event.target.value); if (event.target.value && quantity) setPrice(deriveRate(quantity, event.target.value)); }} /></div></label></div>
            </>}

            {entryType === "Expense" && <><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{["Labour", "Rent", "Transport", "Electricity", "Cleaning", "Repairs", "Equipment investment", "Miscellaneous"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Amount<div className="moneyInput"><IndianRupee size={16} /><input inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} required /></div></label></>}

            {entryType === "LPG" && <div className="lpgPrompt"><span className="statusDot" />Mark <strong>{state.cylinders[0]?.code}</strong> as empty on this date. Its total life will be calculated automatically.</div>}

            {entryType !== "LPG" && <><label>Payment<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>{["Cash", "UPI", "Credit"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Note <span className="optional">optional</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything useful for later" /></label></>}

            {error && <p role="alert" className="formError">{error}</p>}
            <footer className="sheetFooter"><div><span>{entryType === "LPG" ? "Cylinder status" : "Entry total"}</span><strong>{entryType === "LPG" ? "In use → Empty" : `₹${Number(calculatedTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</strong></div><button type="submit" className="primaryButton" disabled={saving}>{saving ? "Saving…" : `Save ${entryType}`}</button></footer>
          </form>
        )}
      </section>
    </div>
  );
}
