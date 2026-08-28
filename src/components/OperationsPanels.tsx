"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronRight, CircleDollarSign, Flame, IndianRupee, Landmark, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";
import { formatMoney } from "@/domain/decimal";
import { calculateCylinderDays, calculateFinancialSnapshot, calculateLpgPaymentSnapshot, calculateVegetableLineAmount, calculateVegetableOrderTotal, findVendorPrimaryRate } from "@/domain/operations";
import type { AdvancePayment, LpgCylinder, LpgPricing, LpgRefillEvent, RecurringRent, StaffMember, VegetableOrder, VegetableOrderLine } from "@/domain/types";
import { currentBusinessDate, formatBusinessDate } from "@/lib/date";
import { useShopStore } from "@/store/ShopStore";

const vegetableNames = ["Potato", "Cabbage", "Carrot", "Bell pepper", "Beans", "Onion", "Tomato", "Brinjal", "Coriander"];

function lineId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID();
}

function newLine(name = "Potato", rate?: string): VegetableOrderLine {
  return { id: `${lineId(name)}-${crypto.randomUUID().slice(0, 6)}`, name, quantity: "1", unit: name === "Coriander" ? "packet" : "kg", rate };
}

export function VegetableOrdersPanel() {
  const { state, saveVegetableOrder, operationsSyncPending, operationsSyncStatus } = useShopStore();
  const [editing, setEditing] = useState<VegetableOrder | null>(null);
  const orders = state.vegetableOrders.slice().sort((left, right) => right.businessDate.localeCompare(left.businessDate));

  function createOrder() {
    const now = new Date().toISOString();
    const vendorId = state.vendors[0]?.id;
    setEditing({ id: crypto.randomUUID(), shopId: "main-shop", businessDate: currentBusinessDate(), vendorId, items: [newLine("Potato", findVendorPrimaryRate(state.vendorItemRates, vendorId, "Potato", "kg"))], createdAt: now, updatedAt: now });
  }

  return <>
    <section className="vegetableSection">
      <header className="vegetableHeader"><div><span className="eyebrow">Daily purchasing</span><h2>Vegetable orders</h2><p>Quantities are saved now. Add each line amount whenever the bill arrives.</p></div><button className="primaryButton" onClick={createOrder}><Plus size={16} /> New vegetable order</button></header>
      {operationsSyncStatus !== "idle" && <p className={`rateSyncNotice ${operationsSyncStatus}`} role="status">
        {operationsSyncStatus === "syncing" ? "Syncing automatically to MongoDB…"
          : operationsSyncStatus === "retrying" && operationsSyncPending > 0 ? "Saved locally · database unavailable · retrying automatically"
          : "Synced to MongoDB"}
      </p>}
      <div className="vegetableOrderGrid">{orders.map((order) => {
        const total = calculateVegetableOrderTotal(order);
        const vendor = state.vendors.find((candidate) => candidate.id === order.vendorId);
        return <article className="vegetableOrderCard" key={order.id}>
          <div className="orderDate">
            <span><CalendarDays size={17} /></span>
            <div><small>{vendor?.name ?? "Vendor not selected"}</small><strong>{formatBusinessDate(order.businessDate)}</strong></div>
            <div className={`orderTotal ${total ? "" : "pending"}`} aria-label={`Order total for ${order.businessDate}`}><small>Order total</small><strong>{total ? formatMoney(total) : "Rates pending"}</strong></div>
            <button aria-label={`Edit vegetable order ${order.businessDate}`} onClick={() => setEditing(structuredClone(order))}><Pencil size={15} /></button>
          </div>
          <div className="vegetableLines">{order.items.map((item) => <div key={item.id}><span>{item.name}</span><strong>{item.quantity} {item.unit}</strong><small>{item.rate ? `${formatMoney(item.rate)} / ${item.unit}` : "Rate pending"}</small></div>)}</div>
          <footer><span>{order.items.length} vegetables</span></footer>
        </article>;
      })}</div>
    </section>
    {editing && <VegetableOrderDialog order={editing} onClose={() => setEditing(null)} onSave={saveVegetableOrder} />}
  </>;
}

function VegetableOrderDialog({ order, onClose, onSave }: { order: VegetableOrder; onClose: () => void; onSave: (order: VegetableOrder, setAsPrimaryRates?: boolean) => Promise<void> }) {
  const { state } = useShopStore();
  const [draft, setDraft] = useState(order);
  const [setAsPrimaryRates, setSetAsPrimaryRates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const vendor = state.vendors.find((candidate) => candidate.id === draft.vendorId);

  function updateLine(id: string, updates: Partial<VegetableOrderLine>) {
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...updates } : item) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave({ ...draft, shopId: draft.shopId || "main-shop", items: draft.items.map((item) => ({ ...item, amount: calculateVegetableLineAmount(item) })), updatedAt: new Date().toISOString() }, setAsPrimaryRates); onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the order"); }
    finally { setSaving(false); }
  }

  function changeVegetable(item: VegetableOrderLine, name: string) {
    const unit = name === "Coriander" ? "packet" : item.unit;
    updateLine(item.id, { name, unit, rate: findVendorPrimaryRate(state.vendorItemRates, draft.vendorId, name, unit), amount: undefined });
  }

  function addVegetable() {
    const name = "Cabbage"; const unit = "kg";
    setDraft((current) => ({ ...current, items: [...current.items, newLine(name, findVendorPrimaryRate(state.vendorItemRates, current.vendorId, name, unit))] }));
  }

  return <div className="sheetBackdrop"><section className="operationDialog vegetableDialog" role="dialog" aria-modal="true" aria-label="Edit vegetable order">
    <header><div><span className="eyebrow">Editable order</span><h2>Vegetables for the day</h2></div><button type="button" className="iconButton" aria-label="Close vegetable order" onClick={onClose}><X size={19} /></button></header>
    <form onSubmit={submit}>
      <div className="orderMetaFields"><label>Order date<input type="date" value={draft.businessDate} onChange={(event) => setDraft((current) => ({ ...current, businessDate: event.target.value }))} required /></label><label>Vegetable vendor<select aria-label="Vegetable vendor" value={draft.vendorId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, vendorId: event.target.value || undefined }))}><option value="">Select vendor</option>{state.vendors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="vegetableEditRows">{draft.items.map((item, index) => <div className="vegetableEditRow" key={item.id}><span className="lineNumber">{index + 1}</span><label>Vegetable<input list="vegetable-options" value={item.name} onChange={(event) => changeVegetable(item, event.target.value)} required /></label><label>Quantity<input inputMode="decimal" value={item.quantity} onChange={(event) => updateLine(item.id, { quantity: event.target.value, amount: undefined })} required /></label><label>Unit<select value={item.unit} onChange={(event) => { const unit = event.target.value as VegetableOrderLine["unit"]; updateLine(item.id, { unit, rate: findVendorPrimaryRate(state.vendorItemRates, draft.vendorId, item.name, unit), amount: undefined }); }}><option value="kg">kg</option><option value="packet">packet</option></select></label><label>Rate / unit<div className="moneyInput"><IndianRupee size={14} /><input inputMode="decimal" value={item.rate ?? ""} onChange={(event) => updateLine(item.id, { rate: event.target.value || undefined, amount: undefined })} placeholder="Add rate" /></div></label><div className="computedLine"><small>Line total</small><strong>{calculateVegetableLineAmount(item) ? formatMoney(calculateVegetableLineAmount(item)!) : "Pending"}</strong></div><button type="button" className="removeLine" aria-label={`Remove ${item.name}`} disabled={draft.items.length === 1} onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((candidate) => candidate.id !== item.id) }))}><Trash2 size={15} /></button></div>)}</div>
      <datalist id="vegetable-options">{vegetableNames.map((name) => <option key={name} value={name} />)}</datalist>
      <button type="button" className="addLineButton" onClick={addVegetable}><Plus size={15} /> Add another vegetable</button>
      <label className="primaryRateChoice"><input aria-label="Update primary vendor rates" type="checkbox" checked={setAsPrimaryRates} onChange={(event) => setSetAsPrimaryRates(event.target.checked)} /><span><strong>Use these as the primary rates</strong><small>Checked rates will prefill future orders from {vendor?.name ?? "this vendor"}. Today&apos;s order keeps its own price even if the primary rate changes later.</small></span></label>
      {error && <p role="alert" className="formError">{error}</p>}
      <footer><div><small>Order total</small><strong>{calculateVegetableOrderTotal(draft) ? formatMoney(calculateVegetableOrderTotal(draft)!) : "Rates pending"}</strong></div><button className="primaryButton" disabled={saving}>{saving ? "Saving…" : <><Check size={16} /> Save order</>}</button></footer>
    </form>
  </section></div>;
}

export function FinancialSnapshotStrip() {
  const { state } = useShopStore();
  const snapshot = calculateFinancialSnapshot(state);
  return <section className="commitmentStrip"><div><span><Landmark size={17} /></span><p><small>Advances paid</small><strong>{formatMoney(snapshot.advancesPaid)}</strong></p></div><div><span><CircleDollarSign size={17} /></span><p><small>Advance pending</small><strong>{formatMoney(snapshot.advancesPending)}</strong></p></div><div><span><CalendarDays size={17} /></span><p><small>Monthly rent</small><strong>{formatMoney(snapshot.monthlyRent)}</strong></p></div><p className="commitmentNote">Tracked separately from operating profit</p></section>;
}

export function FinancialCommitmentsPanel() {
  const { state } = useShopStore();
  const snapshot = calculateFinancialSnapshot(state);
  const [advance, setAdvance] = useState<AdvancePayment | null>(null);
  const [rent, setRent] = useState<RecurringRent | null>(null);
  return <>
    <section className="panel financeCommitments"><header><div><span className="eyebrow">Cash commitments</span><h2>Advances &amp; rent</h2><p>Advances stay separate from profit while their paid and pending balances remain visible.</p></div><div><small>Total committed</small><strong>{formatMoney(String(Number(snapshot.advancesPaid) + Number(snapshot.advancesPending)))}</strong></div></header><div className="financeColumns"><div><h3>Advance payments <span>{formatMoney(snapshot.advancesPaid)} paid</span></h3>{state.advancePayments.map((item) => { const pending = Number(item.totalAmount) - Number(item.paidAmount); const progress = Number(item.totalAmount) ? Math.min(100, Number(item.paidAmount) / Number(item.totalAmount) * 100) : 0; return <button key={item.id} onClick={() => setAdvance({ ...item })}><span className="financeIcon"><Landmark size={16} /></span><div><strong>{item.label}</strong><small>{item.note ?? `${formatMoney(item.paidAmount)} paid`}</small><i><b style={{ width: `${progress}%` }} /></i></div><p><strong>{formatMoney(item.paidAmount)}</strong><small>{pending ? `${formatMoney(String(pending))} pending` : "Fully paid"}</small></p><Pencil size={14} /></button>; })}</div><div><h3>Monthly rent <span>{formatMoney(snapshot.monthlyRent)} / month</span></h3>{state.recurringRents.map((item) => <button key={item.id} onClick={() => setRent({ ...item })}><span className="financeIcon rent"><CalendarDays size={16} /></span><div><strong>{item.label}</strong><small>Recurring every month</small></div><p><strong>{formatMoney(item.monthlyAmount)}</strong><small>per month</small></p><Pencil size={14} /></button>)}</div></div></section>
    {advance && <AdvanceDialog advance={advance} onClose={() => setAdvance(null)} />}
    {rent && <RentDialog rent={rent} onClose={() => setRent(null)} />}
  </>;
}

function AdvanceDialog({ advance, onClose }: { advance: AdvancePayment; onClose: () => void }) {
  const { updateAdvancePayment } = useShopStore(); const [draft, setDraft] = useState(advance); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await updateAdvancePayment(draft.id, draft); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the advance"); } finally { setSaving(false); } }
  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Edit advance payment"><header><div><span className="eyebrow">Advance payment</span><h2>{draft.label}</h2></div><button className="iconButton" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label>Name<input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label><div className="fieldPair"><label>Amount paid<input inputMode="decimal" value={draft.paidAmount} onChange={(event) => setDraft({ ...draft, paidAmount: event.target.value })} /></label><label>Overall amount<input inputMode="decimal" value={draft.totalAmount} onChange={(event) => setDraft({ ...draft, totalAmount: event.target.value })} /></label></div><label>Note<input value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value || undefined })} /></label>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save advance"}</button></form></section></div>;
}

function RentDialog({ rent, onClose }: { rent: RecurringRent; onClose: () => void }) {
  const { updateRecurringRent } = useShopStore(); const [draft, setDraft] = useState(rent); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await updateRecurringRent(draft.id, draft); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save rent"); } finally { setSaving(false); } }
  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Edit recurring rent"><header><div><span className="eyebrow">Monthly rent</span><h2>{draft.label}</h2></div><button className="iconButton" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label>Name<input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label><label>Monthly amount<input inputMode="decimal" value={draft.monthlyAmount} onChange={(event) => setDraft({ ...draft, monthlyAmount: event.target.value })} /></label>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save rent"}</button></form></section></div>;
}

export function LpgAndSalaryPanel() {
  const { state } = useShopStore();
  const [cylinder, setCylinder] = useState<LpgCylinder | null>(null);
  const [refill, setRefill] = useState<LpgRefillEvent | null>(null);
  const [newRefill, setNewRefill] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const activeCylinder = state.cylinders.find((candidate) => candidate.status === "In use");
  const days = calculateCylinderDays(activeCylinder?.startedOn, activeCylinder?.ranOutOn, currentBusinessDate());
  const monthlyPayroll = useMemo(() => state.staff.filter((member) => member.status === "Active").reduce((total, member) => total + Number(member.monthlySalary), 0), [state.staff]);
  const lpgPayments = calculateLpgPaymentSnapshot(state);

  function beginRefill() {
    const selected = activeCylinder ?? state.cylinders.find((candidate) => candidate.status === "Empty") ?? state.cylinders[0];
    if (!selected) return;
    setNewRefill(true);
    setRefill({ id: crypto.randomUUID(), cylinderId: selected.id, ranOutOn: currentBusinessDate(), refilledOn: currentBusinessDate(), amount: state.lpgPricing.refillCost, paymentStatus: "Due", previousStartedOn: selected.startedOn });
  }

  return <>
    <section className="operationsOverview"><article className="panel lpgMonitor"><header><span className="adminIcon fire"><Flame size={22} /></span><div><small>LPG monitor</small><h3>{state.cylinders.length} cylinders · {activeCylinder ? "1 in use" : "none in use"}</h3></div><button className="miniEdit" onClick={() => setPricingOpen(true)}><Pencil size={13} /> Pricing</button></header><div className="lpgPricingStrip"><div><small>Initial / cylinder</small><strong>{formatMoney(state.lpgPricing.initialCostPerCylinder)}</strong></div><div><small>Refill default</small><strong>{formatMoney(state.lpgPricing.refillCost)}</strong></div><div><small>Paid incl. advance</small><strong>{formatMoney(lpgPayments.paid)}</strong></div><div><small>Refill due</small><strong>{formatMoney(lpgPayments.due)}</strong></div></div><div className="cylinderRail">{state.cylinders.map((item) => <button key={item.id} onClick={() => setCylinder({ ...item })}><span className={`cylinderStatus ${item.status.toLowerCase().replace(" ", "-")}`} /><div><strong>{item.code}</strong><small>{item.status} · purchased {formatBusinessDate(item.bookedOn)}</small></div><b>{item.status === "In use" && days ? `${days} days` : item.status === "Available" ? "Unused" : "View"}</b><ChevronRight size={16} /></button>)}</div><div className="refillActions"><button className="primaryButton" onClick={beginRefill}><Plus size={15} /> Record refill</button>{state.lpgRefills.map((event) => <button className="refillHistory" key={event.id} onClick={() => { setNewRefill(false); setRefill({ ...event }); }}><span>{formatBusinessDate(event.refilledOn)} · {state.cylinders.find((item) => item.id === event.cylinderId)?.code}</span><strong>{formatMoney(event.amount)} · {event.paymentStatus}</strong></button>)}</div><footer><span>Current cylinder started</span><strong>{activeCylinder?.startedOn ? formatBusinessDate(activeCylinder.startedOn) : "Not recorded"}</strong></footer></article><article className="panel salaryMonitor"><header><span className="adminIcon"><UsersRound size={22} /></span><div><small>Salary monitor</small><h3>{formatMoney(String(monthlyPayroll))} monthly payroll</h3></div></header><div className="salaryList">{state.staff.map((member) => <button key={member.id} onClick={() => setStaff({ ...member })}><span>{member.name.charAt(0)}</span><div><strong>{member.name}</strong><small>{member.status} · {formatMoney(member.monthlySalary)} / month</small></div><b>{Number(member.advanceBalance) ? `${formatMoney(member.advanceBalance)} advance` : "No advance"}</b><Pencil size={14} /></button>)}</div><footer><span>Salary amounts remain editable</span><strong>{state.staff.length} records</strong></footer></article></section>
    {cylinder && <CylinderDialog cylinder={cylinder} onClose={() => setCylinder(null)} />}
    {staff && <StaffDialog member={staff} onClose={() => setStaff(null)} />}
    {refill && <LpgRefillDialog refill={refill} isNew={newRefill} onClose={() => setRefill(null)} />}
    {pricingOpen && <LpgPricingDialog pricing={state.lpgPricing} onClose={() => setPricingOpen(false)} />}
  </>;
}

function LpgPricingDialog({ pricing, onClose }: { pricing: LpgPricing; onClose: () => void }) {
  const { updateLpgPricing } = useShopStore(); const [draft, setDraft] = useState(pricing); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await updateLpgPricing(draft); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save LPG pricing"); } finally { setSaving(false); } }
  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Edit LPG pricing"><header><div><span className="eyebrow">LPG pricing</span><h2>Costs &amp; refill</h2></div><button className="iconButton" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label>Initial cost per cylinder<input inputMode="decimal" value={draft.initialCostPerCylinder} onChange={(event) => setDraft({ ...draft, initialCostPerCylinder: event.target.value })} required /></label><label>Default refill / top-up<input inputMode="decimal" value={draft.refillCost} onChange={(event) => setDraft({ ...draft, refillCost: event.target.value })} required /></label>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save LPG pricing"}</button></form></section></div>;
}

function LpgRefillDialog({ refill, isNew, onClose }: { refill: LpgRefillEvent; isNew: boolean; onClose: () => void }) {
  const { state, saveLpgRefill, updateCylinder } = useShopStore(); const [draft, setDraft] = useState(refill); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try {
    const saved = { ...draft, paidOn: draft.paymentStatus === "Paid" ? (draft.paidOn || currentBusinessDate()) : undefined, paymentMethod: draft.paymentStatus === "Paid" ? (draft.paymentMethod || "UPI") : undefined };
    await saveLpgRefill(saved);
    if (isNew) await updateCylinder(saved.cylinderId, { status: "Available", bookedOn: saved.refilledOn, startedOn: undefined, ranOutOn: undefined });
    onClose();
  } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the refill"); } finally { setSaving(false); } }
  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Record LPG refill"><header><div><span className="eyebrow">Cylinder lifecycle</span><h2>{isNew ? "Record refill" : "Update refill payment"}</h2></div><button className="iconButton" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label>Cylinder<select value={draft.cylinderId} onChange={(event) => setDraft({ ...draft, cylinderId: event.target.value })}>{state.cylinders.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label><div className="fieldPair"><label>Ran out on<input type="date" value={draft.ranOutOn} onChange={(event) => setDraft({ ...draft, ranOutOn: event.target.value })} required /></label><label>Refilled on<input type="date" value={draft.refilledOn} onChange={(event) => setDraft({ ...draft, refilledOn: event.target.value })} required /></label></div><label>Refill amount<input inputMode="decimal" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} required /></label><label>Payment status<select value={draft.paymentStatus} onChange={(event) => setDraft({ ...draft, paymentStatus: event.target.value as LpgRefillEvent["paymentStatus"] })}><option>Due</option><option>Paid</option></select></label>{draft.paymentStatus === "Paid" && <div className="fieldPair"><label>Paid on<input type="date" value={draft.paidOn ?? currentBusinessDate()} onChange={(event) => setDraft({ ...draft, paidOn: event.target.value })} required /></label><label>Paid via<select value={draft.paymentMethod ?? "UPI"} onChange={(event) => setDraft({ ...draft, paymentMethod: event.target.value as "Cash" | "UPI" })}><option>UPI</option><option>Cash</option></select></label></div>}<label>Note<input value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value || undefined })} placeholder="Optional receipt or supplier note" /></label>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving}>{saving ? "Saving…" : draft.paymentStatus === "Paid" ? "Save paid refill" : "Save as due"}</button></form></section></div>;
}

function CylinderDialog({ cylinder, onClose }: { cylinder: LpgCylinder; onClose: () => void }) {
  const { updateCylinder } = useShopStore(); const [draft, setDraft] = useState(cylinder); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await updateCylinder(draft.id, draft); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the cylinder"); } finally { setSaving(false); } }
  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Edit LPG cylinder"><header><div><span className="eyebrow">LPG lifecycle</span><h2>{draft.code}</h2></div><button className="iconButton" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LpgCylinder["status"] })}>{["Booked", "Available", "In use", "Empty"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Supplier<input value={draft.supplier} onChange={(event) => setDraft({ ...draft, supplier: event.target.value })} placeholder="Add supplier" /></label><div className="fieldPair"><label>Purchased on<input type="date" value={draft.bookedOn} onChange={(event) => setDraft({ ...draft, bookedOn: event.target.value })} /></label><label>Started on<input type="date" value={draft.startedOn ?? ""} onChange={(event) => setDraft({ ...draft, startedOn: event.target.value || undefined })} /></label></div><div className="fieldPair"><label>Ran out on<input type="date" value={draft.ranOutOn ?? ""} onChange={(event) => setDraft({ ...draft, ranOutOn: event.target.value || undefined })} /></label><label>Cost <span>optional</span><input inputMode="decimal" value={draft.cost ?? ""} onChange={(event) => setDraft({ ...draft, cost: event.target.value || undefined })} /></label></div>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save cylinder"}</button></form></section></div>;
}

function StaffDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const { updateStaffMember } = useShopStore(); const [draft, setDraft] = useState(member); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await updateStaffMember(draft.id, draft); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save salary"); } finally { setSaving(false); } }
  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Edit salary record"><header><div><span className="eyebrow">Salary record</span><h2>{draft.name}</h2></div><button className="iconButton" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Monthly salary<input inputMode="decimal" value={draft.monthlySalary} onChange={(event) => setDraft({ ...draft, monthlySalary: event.target.value })} /></label><label>Current advance balance<input inputMode="decimal" value={draft.advanceBalance} onChange={(event) => setDraft({ ...draft, advanceBalance: event.target.value })} /></label><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as StaffMember["status"] })}><option>Active</option><option>Inactive</option></select></label>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save salary record"}</button></form></section></div>;
}
