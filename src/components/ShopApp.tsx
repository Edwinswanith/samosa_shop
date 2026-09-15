"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CalendarCheck, ChevronRight,
  CircleGauge, ClipboardList, Database, Flame, IndianRupee, LayoutDashboard, MoreHorizontal,
  PackageOpen, Plus, ReceiptIndianRupee, RotateCcw, ShoppingBasket, Store,
  UsersRound, WalletCards, Wheat, X,
} from "lucide-react";
import { calculateDashboard, calculateInventory, calculatePeriodSummary, calculateTotalReceivable } from "@/domain/ledger";
import { formatMoney } from "@/domain/decimal";
import { displayQuantity } from "@/domain/units";
import { downloadTransactionsCsv } from "@/domain/export";
import type { ShopTransaction } from "@/domain/types";
import { currentBusinessDate, formatBusinessDate } from "@/lib/date";
import { ShopStoreProvider, useShopStore } from "@/store/ShopStore";
import { EntrySheet } from "./EntrySheet";
import { FinancialCommitmentsPanel, FinancialSnapshotStrip, LpgAndSalaryPanel, VegetableOrdersPanel } from "./OperationsPanels";
import { CustomerSettlementPanel } from "./CustomerSettlementPanel";
import { DailyExpenseHistory } from "./DailyExpenseHistory";

type Page = "Dashboard" | "Daily Entry" | "Inventory" | "Reports" | "More";
const navigation: Array<{ page: Page; icon: typeof LayoutDashboard }> = [
  { page: "Dashboard", icon: LayoutDashboard }, { page: "Daily Entry", icon: ClipboardList },
  { page: "Inventory", icon: PackageOpen }, { page: "Reports", icon: BarChart3 },
  { page: "More", icon: MoreHorizontal },
];

export function ShopApp() { return <ShopStoreProvider><ShopWorkspace /></ShopStoreProvider>; }

function ShopWorkspace() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [entryOpen, setEntryOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  return <div className="appFrame">
    <aside className="sidebar">
      <div className="brandMark"><span className="brandSeal">S</span><div><strong>Samosa & Co.</strong><small>Shop manager</small></div></div>
      <nav>{navigation.map(({ page: item, icon: Icon }) => <button key={item} className={page === item ? "active" : ""} onClick={() => setPage(item)}><Icon size={19} /><span>{item}</span></button>)}</nav>
      <div className="sidebarNote"><Wheat size={23} /><strong>Data streak</strong><span>12 days complete</span><div><i style={{ width: "72%" }} /></div></div>
      <button className="profileButton"><span>ES</span><div><strong>Edwin</strong><small>Owner</small></div><ChevronRight size={16} /></button>
    </aside>
    <main className="mainCanvas"><TopBar onAdd={() => setEntryOpen(true)} /><div className="pageContent">
      {page === "Dashboard" && <Dashboard onAdd={() => setEntryOpen(true)} onCloseDay={() => setClosingOpen(true)} />}
      {page === "Daily Entry" && <DailyEntry onAdd={() => setEntryOpen(true)} />}
      {page === "Inventory" && <Inventory />}{page === "Reports" && <Reports />}{page === "More" && <MorePage />}
    </div></main>
    <nav className="mobileNav">{navigation.map(({ page: item, icon: Icon }) => <button key={item} className={page === item ? "active" : ""} onClick={() => setPage(item)}><Icon size={20} /><span>{item === "Daily Entry" ? "Entry" : item}</span></button>)}</nav>
    <button className="floatingAdd" aria-label="Add entry" onClick={() => setEntryOpen(true)}><Plus size={24} /><span>Add entry</span></button>
    {entryOpen && <EntrySheet onClose={() => setEntryOpen(false)} />}{closingOpen && <ClosingDialog onClose={() => setClosingOpen(false)} />}
  </div>;
}

function TopBar({ onAdd }: { onAdd: () => void }) { return <header className="topBar"><div className="mobileBrand"><span className="brandSeal">S</span><strong>Samosa & Co.</strong></div><div className="topDate"><CalendarCheck size={17} />{formatBusinessDate(currentBusinessDate())}<span className="livePill">Live day</span></div><button className="topAdd" onClick={onAdd}><Plus size={18} /> New entry</button></header>; }

function Dashboard({ onAdd, onCloseDay }: { onAdd: () => void; onCloseDay: () => void }) {
  const { state } = useShopStore(); const date = currentBusinessDate(); const dashboard = calculateDashboard(state, date); const inventory = calculateInventory(state);
  const overall = calculatePeriodSummary(state);
  return <>
    <section className="pageIntro"><div><span className="eyebrow">Thursday · Open since 6:30 AM</span><h1>Good afternoon, Edwin.</h1><p>Your counter is moving well. University sales lead today&apos;s revenue.</p></div><button className="outlineButton" onClick={onCloseDay}><CalendarCheck size={17} /> Close today</button></section>
    <section className="metricGrid"><MetricCard label="Overall sales" value={formatMoney(overall.revenue)} note={`${overall.unitsSold} items across all recorded days`} trend="Lifetime" icon={IndianRupee} tone="saffron" /><MetricCard label="Overall spending" value={formatMoney(overall.spending)} note="Purchases, operating costs, and investments" trend="Recorded" icon={WalletCards} tone="tomato" /><MetricCard label="Overall profit" value={formatMoney(overall.profit)} note="Sales minus all recorded spending" trend="Net" icon={ArrowUpRight} tone="leaf" /><MetricCard label="Today's sales" value={formatMoney(dashboard.revenue)} note={`${dashboard.productQuantities.samosa ?? "0"} samosas · ${dashboard.productQuantities["kathi-roll"] ?? "0"} rolls`} trend="Daily" icon={ShoppingBasket} tone="ink" /></section>
    <FinancialSnapshotStrip />
    <SalesByDate />
    <section className="dashboardGrid">
      <article className="panel ingredientsPanel"><PanelTitle eyebrow="Live stock" title="Ingredients at hand" action="View inventory" /><div className="ingredientList">{inventory.slice(0, 4).map((balance) => { const item = state.items.find((candidate) => candidate.id === balance.itemId); return <div key={balance.itemId}><span className="ingredientIcon"><Wheat size={17} /></span><div><strong>{item?.name}</strong><small>{item?.category}</small></div><span>{displayQuantity(balance.quantity, balance.unit)}</span></div>; })}</div></article>
      <CustomerSettlementPanel compact />
      <article className="panel activityPanel"><PanelTitle eyebrow="Audit trail" title="Recent activity" action="See all" /><TransactionList transactions={state.transactions.filter((entry) => entry.businessDate === date).slice(-4).reverse()} /></article>
    </section>
    <section className="quickStrip"><div><span className="quickIcon"><Plus size={21} /></span><div><strong>Something happened at the shop?</strong><span>Record it while it&apos;s fresh. Most entries take under 20 seconds.</span></div></div><button className="primaryButton" onClick={onAdd}>Add an entry</button></section>
  </>;
}

type SalesPeriod = "today" | "week" | "all" | "custom";

function daysBefore(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - days);
  return parsed.toISOString().slice(0, 10);
}

function SalesByDate() {
  const { state } = useShopStore();
  const today = currentBusinessDate();
  const saleDates = state.transactions.filter((entry) => entry.kind === "sale").map((entry) => entry.businessDate).sort();
  const [period, setPeriod] = useState<SalesPeriod>("all");
  const [from, setFrom] = useState(saleDates[0] ?? today);
  const [to, setTo] = useState(saleDates.at(-1) ?? today);
  const rangeFrom = period === "today" ? today : period === "week" ? daysBefore(today, 6) : period === "custom" ? from : undefined;
  const rangeTo = period === "today" || period === "week" ? today : period === "custom" ? to : undefined;
  const summary = useMemo(() => calculatePeriodSummary(state, rangeFrom, rangeTo), [rangeFrom, rangeTo, state]);
  const periodLabel = period === "today" ? "Today" : period === "week" ? "Last 7 days" : period === "custom" ? "Custom dates" : "All recorded dates";

  return <article className="panel salesLedgerPanel">
    <header className="salesLedgerHead"><div><span className="eyebrow">Daily and weekly status</span><h2>Sales by business date</h2><p>Adjust the range to check one day, the latest week, or any dates you choose.</p></div><div className="periodTotal"><small>{periodLabel}</small><strong>{formatMoney(summary.revenue)}</strong><span>{summary.unitsSold} items</span></div></header>
    <div className="rangeToolbar" aria-label="Sales period">
      <div className="rangePresets">{[["today", "Today"], ["week", "7 days"], ["all", "All time"], ["custom", "Custom"]].map(([value, label]) => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value as SalesPeriod)}>{label}</button>)}</div>
      {period === "custom" && <div className="customRange"><label>From<input aria-label="Sales from date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><span>to</span><label>Until<input aria-label="Sales until date" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>}
    </div>
    <div className="salesTableWrap"><table className="salesTable"><thead><tr><th>Date</th><th><span className="productDot samosa" />Samosa <small>₹14</small></th><th><span className="productDot roll" />Kathi roll <small>₹65</small></th><th>Daily sales</th></tr></thead><tbody>{summary.dailySales.length ? summary.dailySales.slice().reverse().map((day) => <tr key={day.businessDate}><td><strong>{formatBusinessDate(day.businessDate)}</strong><small>{day.businessDate}</small></td><td><strong>{day.samosaQuantity}</strong><small>{formatMoney(day.samosaRevenue)}</small></td><td><strong>{day.kathiRollQuantity}</strong><small>{formatMoney(day.kathiRollRevenue)}</small></td><td><strong>{formatMoney(day.revenue)}</strong></td></tr>) : <tr><td colSpan={4} className="emptySales">No sales recorded in this range.</td></tr>}</tbody></table></div>
  </article>;
}

function MetricCard({ label, value, note, trend, icon: Icon, tone }: { label: string; value: string; note: string; trend: string; icon: typeof IndianRupee; tone: string }) { return <article className={`metricCard ${tone}`}><div className="metricTop"><span className="metricIcon"><Icon size={20} /></span><span className="trendPill"><ArrowUpRight size={13} />{trend}</span></div><small>{label}</small><strong>{value}</strong><p>{note}</p></article>; }
function PanelTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action: string }) { return <header className="panelTitle"><div><span>{eyebrow}</span><h3>{title}</h3></div><button>{action}<ChevronRight size={15} /></button></header>; }

function TransactionList({ transactions }: { transactions: ShopTransaction[] }) {
  const { state } = useShopStore(); return <div className="transactionList">{transactions.map((entry) => { let title = "Shop activity", detail = entry.businessDate, amount = ""; let positive = false;
    if (entry.kind === "sale") { title = state.products.find((p) => p.id === entry.productId)?.name ?? "Sale"; const customer = state.customers.find((candidate) => candidate.id === entry.customerId)?.name; detail = `${customer ?? entry.channel} · ${entry.quantity} sold`; amount = `+${formatMoney(entry.revenue)}`; positive = true; }
    if (entry.kind === "inventory") { title = state.items.find((i) => i.id === entry.itemId)?.name ?? "Inventory"; detail = `${entry.transactionType} · ${entry.enteredQuantity} ${entry.enteredUnit}`; amount = entry.transactionType === "purchase" ? `-${formatMoney(entry.value)}` : "Stock"; }
    if (entry.kind === "expense") { title = entry.category; detail = entry.note || "Expense"; amount = `-${formatMoney(entry.amount)}`; }
    if (entry.kind === "payment") { title = `${state.customers.find((customer) => customer.id === entry.customerId)?.name ?? "Customer"} payment`; detail = entry.paymentMethod; amount = `+${formatMoney(entry.amount)}`; positive = true; }
    return <div key={entry.id}><span className={positive ? "positive" : "negative"}>{positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span><div><strong>{title}</strong><small>{detail}</small></div><b className={positive ? "positiveText" : ""}>{amount}</b></div>;
  })}</div>;
}

function DailyEntry({ onAdd }: { onAdd: () => void }) { const { state } = useShopStore(); const date = currentBusinessDate(); const today = state.transactions.filter((entry) => entry.businessDate === date).slice().reverse(); return <><section className="pageIntro compact"><div><span className="eyebrow">Daily ledger</span><h1>Everything that happened today.</h1><p>{today.length} entries recorded across sales, stock, payments, and expenses.</p></div><button className="primaryButton" onClick={onAdd}><Plus size={17} /> Add entry</button></section><section className="pageSplit"><article className="panel fullPanel"><PanelTitle eyebrow={formatBusinessDate(date)} title="Today’s timeline" action="Export" /><TransactionList transactions={today} /></article><aside className="panel entryGuide"><span className="guideSeal"><CircleGauge size={26} /></span><h3>Keep the day clean</h3><p>Record purchases when they arrive and usage before closing. Your profit estimate depends on it.</p><ul><li><CheckLine done label="Sales entered" /></li><li><CheckLine done label="Purchases entered" /></li><li><CheckLine label="Evening consumption" /></li><li><CheckLine label="Count cash and close" /></li></ul></aside></section><DailyExpenseHistory /></>; }
function CheckLine({ done, label }: { done?: boolean; label: string }) { return <span className={done ? "done" : ""}><i>{done ? "✓" : ""}</i>{label}</span>; }

function Inventory() { const { state } = useShopStore(); const balances = calculateInventory(state); return <><section className="pageIntro compact"><div><span className="eyebrow">Stock ledger</span><h1>Know what is ordered and on the shelf.</h1><p>Capture the daily vegetable order first, then add bill amounts whenever they arrive.</p></div><span className="syncModePill"><Database size={16} /> Database auto-sync enabled</span></section><VegetableOrdersPanel /><section className="inventoryGrid">{balances.map((balance, index) => { const item = state.items.find((candidate) => candidate.id === balance.itemId)!; const low = Number(balance.quantity) <= Number(item.lowStockAt ?? 0); return <article className="stockCard" key={item.id}><div className="stockOrdinal">{String(index + 1).padStart(2, "0")}</div><div className="stockHead"><span className={low ? "stockIcon low" : "stockIcon"}><Wheat size={21} /></span><span className={low ? "stockStatus low" : "stockStatus"}>{low ? "Low stock" : "In stock"}</span></div><small>{item.category}</small><h3>{item.name}</h3><strong>{displayQuantity(balance.quantity, balance.unit)}</strong><div className="stockBar"><i style={{ width: `${Math.min(100, Math.max(10, Number(balance.quantity) / Math.max(1, Number(item.lowStockAt ?? 1)) * 45))}%` }} /></div><button>View ledger <ChevronRight size={15} /></button></article>; })}<article className="stockCard addStock"><Plus size={25} /><h3>Add a new item</h3><p>Cheese, drinks, packaging, or anything else.</p></article></section></>; }

function Reports() {
  const { state } = useShopStore();
  const dashboard = calculateDashboard(state, currentBusinessDate());
  const totalReceivables = calculateTotalReceivable(state);
  return <><section className="pageIntro compact"><div><span className="eyebrow">Reports</span><h1>Cash flow is not profit.</h1><p>This report keeps money movement separate from materials actually consumed.</p></div><button className="outlineButton" onClick={() => downloadTransactionsCsv(state.transactions)}>Export CSV</button></section><section className="reportHero"><div><small>Estimated operating profit</small><strong>{formatMoney(dashboard.estimatedProfit)}</strong><span>Revenue minus materials consumed and operating expenses</span></div><div className="waterfall"><ReportStep label="Revenue" value={dashboard.revenue} kind="plus" /><ReportStep label="Materials used" value={dashboard.materialsConsumed} kind="minus" /><ReportStep label="Operating costs" value={dashboard.expenses} kind="minus" /><ReportStep label="Estimated profit" value={dashboard.estimatedProfit} kind="total" /></div></section><section className="reportCards"><ReportCard icon={ShoppingBasket} title="Sales report" value={formatMoney(dashboard.revenue)} note={`${dashboard.unitsSold} items sold today`} /><ReportCard icon={Wheat} title="Ingredient usage" value={formatMoney(dashboard.materialsConsumed)} note="Manual consumption and waste" /><ReportCard icon={Flame} title="LPG lifecycle" value="4 days" note="Current cylinder in use" /><ReportCard icon={UsersRound} title="Receivables" value={formatMoney(totalReceivables)} note={`${state.customers.length} customer locations tracked separately`} /></section><CustomerSettlementPanel /></>;
}
function ReportStep({ label, value, kind }: { label: string; value: string; kind: string }) { return <div className={kind}><span>{label}</span><strong>{kind === "minus" ? "−" : kind === "plus" ? "+" : ""}{formatMoney(value)}</strong></div>; }
function ReportCard({ icon: Icon, title, value, note }: { icon: typeof Store; title: string; value: string; note: string }) { return <article><span><Icon size={21} /></span><div><small>{title}</small><strong>{value}</strong><p>{note}</p></div><ChevronRight size={18} /></article>; }

function MorePage() { const { state, resetDemo } = useShopStore(); return <><section className="pageIntro compact"><div><span className="eyebrow">Shop administration</span><h1>Fuel, finances, salaries, and the people behind the counter.</h1><p>Edit advances, rents, LPG lifecycle dates, salary amounts, customers, vendors, and other shop masters.</p></div></section><FinancialCommitmentsPanel /><LpgAndSalaryPanel /><section className="adminGrid">{[[Store, "Vendors", `${state.vendors.length} suppliers`], [BookOpen, "Customers", `${state.customers.length} account`], [ShoppingBasket, "Products", `${state.products.length} active`], [ReceiptIndianRupee, "Expense rules", "3 recurring"]].map(([Icon, title, note]) => { const C = Icon as typeof Store; return <article className="adminLink" key={String(title)}><span><C size={21} /></span><div><strong>{String(title)}</strong><small>{String(note)}</small></div><ChevronRight size={18} /></article>; })}</section><button className="resetButton" onClick={resetDemo}><RotateCcw size={16} /> Restore demonstration data</button></>; }

function ClosingDialog({ onClose }: { onClose: () => void }) { const { closeDay } = useShopStore(); const [cash, setCash] = useState(""); const [note, setNote] = useState(""); const date = currentBusinessDate(); return <div className="sheetBackdrop"><section className="closingDialog" role="dialog" aria-label="Close today"><button className="iconButton" onClick={onClose}><X size={20} /></button><span className="closingSeal"><CalendarCheck size={28} /></span><span className="eyebrow">Daily closing</span><h2>Finish {formatBusinessDate(date)}</h2><p>Count the cash in the drawer. The system will preserve today&apos;s snapshot while corrections remain auditable.</p><label>Counted cash<div className="moneyInput"><IndianRupee size={16} /><input autoFocus inputMode="decimal" value={cash} onChange={(event) => setCash(event.target.value)} /></div></label><label>Variance note <span className="optional">optional</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} /></label><button className="primaryButton" onClick={() => { closeDay(date, cash, note); onClose(); }}>Close this day</button></section></div>; }
