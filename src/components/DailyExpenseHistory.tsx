"use client";

import { useMemo, useState } from "react";
import { Banknote, ChevronDown, Flame, PackageCheck, ReceiptIndianRupee, Sprout, UsersRound, Wrench } from "lucide-react";
import { formatMoney } from "@/domain/decimal";
import { buildDailyExpenseHistory, calculateExpenseHistoryTotal, type ExpenseHistoryKind } from "@/domain/expenseHistory";
import { formatBusinessDate } from "@/lib/date";
import { useShopStore } from "@/store/ShopStore";

const icons: Record<ExpenseHistoryKind, typeof Banknote> = {
  purchase: PackageCheck,
  operating: Wrench,
  investment: Banknote,
  vegetable: Sprout,
  salary: UsersRound,
  lpg: Flame,
};

export function DailyExpenseHistory() {
  const { state } = useShopStore();
  const groups = useMemo(() => buildDailyExpenseHistory(state), [state]);
  const [chosenDate, setChosenDate] = useState<string | "none" | null>(null);
  const openDate = chosenDate === null ? groups[0]?.businessDate : chosenDate === "none" ? undefined : chosenDate;
  const recordedTotal = calculateExpenseHistoryTotal(groups);

  return <section className="expenseHistory" role="region" aria-label="Daily expense ledger">
    <header className="expenseHistoryHeader">
      <span className="expenseLedgerSeal"><ReceiptIndianRupee size={24} /></span>
      <div><span className="eyebrow">Expense trail · sales excluded</span><h2>Where the money went</h2><p>Open any date to review purchases, bills, investments, payroll, and pending amounts.</p></div>
      <aside><small>All recorded expenses</small><strong>{formatMoney(recordedTotal)}</strong><span>{groups.length} business days</span></aside>
    </header>
    <div className="expenseDateList">
      {groups.map((group, index) => {
        const expanded = group.businessDate === openDate;
        const panelId = `expense-day-${group.businessDate}`;
        return <article className={`expenseDay ${expanded ? "open" : ""}`} key={group.businessDate}>
          <button className="expenseDaySummary" aria-expanded={expanded} aria-controls={panelId} onClick={() => setChosenDate(expanded ? "none" : group.businessDate)}>
            <span className="expenseDayOrdinal">{String(index + 1).padStart(2, "0")}</span>
            <div className="expenseDayTitle"><strong>{formatBusinessDate(group.businessDate)}</strong><small>{group.items.length} expense {group.items.length === 1 ? "entry" : "entries"}</small></div>
            <div className="expenseDaySplit"><span><i className="paidDot" />{formatMoney(group.paid)} paid</span>{Number(group.pending) > 0 && <span className="pendingAmount"><i />{formatMoney(group.pending)} pending</span>}</div>
            <div className="expenseDayTotal"><small>Daily expense</small><strong>{formatMoney(group.total)}</strong></div>
            <ChevronDown className="expenseChevron" size={18} />
          </button>
          {expanded && <div className="expenseDayBody" id={panelId}>
            <div className="expenseColumnLabels"><span>What it was</span><span>Type</span><span>Payment</span><span>Amount</span></div>
            {group.items.map((item) => { const Icon = icons[item.kind]; return <div className="expenseLine" key={item.id}>
              <span className={`expenseKindIcon ${item.kind}`}><Icon size={16} /></span>
              <div className="expenseLineName"><strong>{item.label}</strong><small>{item.detail}</small></div>
              <span className="expenseCategory">{item.category}</span>
              <span className={`expensePayment ${item.status.toLowerCase()}`}>{item.status}</span>
              <strong className="expenseAmount">{formatMoney(item.amount)}</strong>
            </div>; })}
            <footer><span>Daily total</span><div>{Number(group.pending) > 0 && <small>{formatMoney(group.pending)} still pending</small>}<strong>{formatMoney(group.total)}</strong></div></footer>
          </div>}
        </article>;
      })}
      {!groups.length && <div className="emptyExpenseHistory"><ReceiptIndianRupee size={24} /><strong>No expenses recorded yet</strong><span>Purchases and costs will appear here by business date.</span></div>}
    </div>
  </section>;
}
