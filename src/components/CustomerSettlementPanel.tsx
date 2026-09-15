"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, CheckCircle2, IndianRupee, X } from "lucide-react";
import { formatMoney } from "@/domain/decimal";
import { calculateCustomerCreditStatus, calculateSettlementAmountThroughDate } from "@/domain/ledger";
import { currentBusinessDate, formatBusinessDate } from "@/lib/date";
import { useShopStore } from "@/store/ShopStore";

export function CustomerSettlementPanel({ compact = false }: { compact?: boolean }) {
  const { state } = useShopStore();
  const [payingCustomerId, setPayingCustomerId] = useState<string>();
  if (!state.customers.length) return null;

  if (compact) return <div className="customerAccountsGrid">{state.customers.map((customer) => {
    const account = calculateCustomerCreditStatus(state, customer.id);
    return <article className="panel universityPanel customerAccountCard" role="region" aria-label={`${customer.name} credit account`} key={customer.id}>
      <div className="universityHeader"><span><BookOpen size={22} /></span><div><small>Customer credit account</small><h3>{customer.name}</h3></div></div>
      <div className="universityStats"><div><small>Total sales</small><strong>{formatMoney(account.invoiced)}</strong><span>credit supplied</span></div><div><small>Paid through</small><strong>{account.paidThroughDate ? formatBusinessDate(account.paidThroughDate) : "Not yet"}</strong><span>{formatMoney(account.paid)} received</span></div><div className="outstanding"><small>Pending</small><strong>{formatMoney(account.pending)}</strong><span>still receivable</span></div></div>
      <div className="settlement"><span>Oldest unpaid sale is closed first</span><button disabled={Number(account.pending) <= 0} onClick={() => setPayingCustomerId(customer.id)}>{Number(account.pending) > 0 ? "Record payment" : "Paid up"}</button></div>
    </article>;
  })}{payingCustomerId && <CustomerPaymentDialog customerId={payingCustomerId} onClose={() => setPayingCustomerId(undefined)} />}</div>;

  return <div className="customerSettlementList">{state.customers.map((customer) => {
    const account = calculateCustomerCreditStatus(state, customer.id);
    return <section className="panel customerSettlementPanel" role="region" aria-label={`${customer.name} credit account`} key={customer.id}><header><div><span className="eyebrow">Customer receivables</span><h2>{customer.name} settlement</h2><p>Payments close this location&apos;s oldest sales first, keeping its pending amount separate.</p></div><button className="primaryButton" disabled={Number(account.pending) <= 0} onClick={() => setPayingCustomerId(customer.id)}><IndianRupee size={16} /> {Number(account.pending) > 0 ? "Record payment" : "Paid up"}</button></header><div className="settlementSummary"><div><small>Total credit sales</small><strong>{formatMoney(account.invoiced)}</strong></div><div><small>Payments received</small><strong>{formatMoney(account.paid)}</strong></div><div><small>Fully paid through</small><strong>{account.paidThroughDate ? formatBusinessDate(account.paidThroughDate) : "No date closed"}</strong></div><div className="pending"><small>Amount pending</small><strong>{formatMoney(account.pending)}</strong></div></div><div className="salesTableWrap"><table className="salesTable settlementTable"><thead><tr><th>Sales date</th><th>Credit sale</th><th>Payment allocated</th><th>Pending</th><th>Status</th></tr></thead><tbody>{account.rows.length ? account.rows.map((row) => <tr key={row.businessDate}><td><strong>{formatBusinessDate(row.businessDate)}</strong></td><td>{formatMoney(row.invoiced)}</td><td>{formatMoney(row.allocated)}</td><td><strong>{formatMoney(row.pending)}</strong></td><td><span className={`accountStatus ${row.status.toLowerCase()}`}>{row.status}</span></td></tr>) : <tr><td colSpan={5} className="emptySales">No credit sales recorded for this location.</td></tr>}</tbody></table></div></section>;
  })}{payingCustomerId && <CustomerPaymentDialog customerId={payingCustomerId} onClose={() => setPayingCustomerId(undefined)} />}</div>;
}

function CustomerPaymentDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { state, addTransaction } = useShopStore();
  const customer = state.customers.find((candidate) => candidate.id === customerId);
  const account = calculateCustomerCreditStatus(state, customerId);
  const unpaidRows = account.rows.filter((row) => row.status !== "Paid");
  const [throughDate, setThroughDate] = useState(unpaidRows[0]?.businessDate ?? currentBusinessDate());
  const [amount, setAmount] = useState(calculateSettlementAmountThroughDate(state, customerId, unpaidRows[0]?.businessDate ?? currentBusinessDate()));
  const [paidOn, setPaidOn] = useState(currentBusinessDate());
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI">("UPI");
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");

  function changeThrough(date: string) { setThroughDate(date); setAmount(calculateSettlementAmountThroughDate(state, customerId, date)); }
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); try {
    await addTransaction({ kind: "payment", businessDate: paidOn, customerId, amount, paymentMethod, direction: "received", settlesThroughDate: throughDate, note: `Customer payment recorded through ${throughDate}` });
    onClose();
  } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the payment"); } finally { setSaving(false); } }

  return <div className="sheetBackdrop"><section className="operationDialog compactOperationDialog" role="dialog" aria-modal="true" aria-label="Record customer payment"><header><div><span className="eyebrow">Close customer sales</span><h2>{customer?.name ?? "Customer"} payment</h2></div><button className="iconButton" aria-label="Close customer payment" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><div className="paymentNotice"><CheckCircle2 size={18} /><span>The amount is suggested to fully close every sale through the selected date. You can adjust it for a partial payment.</span></div><label>Close sales through<select value={throughDate} onChange={(event) => changeThrough(event.target.value)}>{unpaidRows.map((row) => <option key={row.businessDate} value={row.businessDate}>{formatBusinessDate(row.businessDate)} · {formatMoney(row.pending)} currently pending</option>)}</select></label><label>Amount received<div className="moneyInput"><IndianRupee size={14} /><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div></label><div className="fieldPair"><label>Payment date<input type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} required /></label><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "Cash" | "UPI")}><option>UPI</option><option>Cash</option></select></label></div><p className="afterPayment">Current pending {formatMoney(account.pending)} · After this payment {formatMoney(String(Math.max(0, Number(account.pending) - Number(amount || 0))))}</p>{error && <p role="alert" className="formError">{error}</p>}<button className="primaryButton" disabled={saving || Number(amount) <= 0}>{saving ? "Saving…" : `Record ${formatMoney(amount || "0")}`}</button></form></section></div>;
}
