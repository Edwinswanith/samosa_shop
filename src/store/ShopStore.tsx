"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createDemoState } from "@/domain/seed";
import { isBusinessDateClosed } from "@/domain/closing";
import { primaryRatesFromOrder } from "@/domain/operations";
import type { AdvancePayment, LpgCylinder, LpgPricing, LpgRefillEvent, NewShopTransaction, RecurringRent, ShopState, ShopTransaction, StaffMember, VegetableOrder } from "@/domain/types";

const STORAGE_KEY = "samosa-shop-state-v1";
const OPERATIONS_OUTBOX_KEY = "samosa-shop-operations-outbox-v1";
const TRANSACTIONS_OUTBOX_KEY = "samosa-shop-transactions-outbox-v1";
const SYNCED_SEED_TRANSACTIONS_KEY = "samosa-shop-synced-seed-transactions-v1";
const SEEDED_INVESTMENT_IDS = new Set(createDemoState().transactions
  .filter((transaction) => transaction.kind === "expense" && transaction.expenseType === "investment")
  .map((transaction) => transaction.id));

interface VegetableOrderSync {
  entity: "vegetableOrder";
  data: VegetableOrder;
  setAsPrimaryRates: boolean;
}

function readOperationsOutbox(): VegetableOrderSync[] {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return [];
  try { return JSON.parse(window.localStorage.getItem(OPERATIONS_OUTBOX_KEY) ?? "[]") as VegetableOrderSync[]; }
  catch { return []; }
}

function writeOperationsOutbox(outbox: VegetableOrderSync[]) {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  window.localStorage.setItem(OPERATIONS_OUTBOX_KEY, JSON.stringify(outbox));
}

function queueVegetableOrderSync(payload: VegetableOrderSync) {
  writeOperationsOutbox([...readOperationsOutbox().filter((pending) => pending.data.id !== payload.data.id), payload]);
}

async function syncVegetableOrder(payload: VegetableOrderSync) {
  try {
    const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) return false;
    writeOperationsOutbox(readOperationsOutbox().filter((pending) => pending.data.id !== payload.data.id || pending.data.updatedAt !== payload.data.updatedAt));
    return true;
  } catch { return false; }
}

function readTransactionOutbox(): ShopTransaction[] {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return [];
  try { return JSON.parse(window.localStorage.getItem(TRANSACTIONS_OUTBOX_KEY) ?? "[]") as ShopTransaction[]; }
  catch { return []; }
}

function writeTransactionOutbox(outbox: ShopTransaction[]) {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  window.localStorage.setItem(TRANSACTIONS_OUTBOX_KEY, JSON.stringify(outbox));
}

function queueTransactionSync(transaction: ShopTransaction) {
  writeTransactionOutbox([...readTransactionOutbox().filter((pending) => pending.idempotencyKey !== transaction.idempotencyKey), transaction]);
}

function readSyncedSeedTransactions() {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return new Set<string>();
  try { return new Set(JSON.parse(window.localStorage.getItem(SYNCED_SEED_TRANSACTIONS_KEY) ?? "[]") as string[]); }
  catch { return new Set<string>(); }
}

async function syncTransaction(transaction: ShopTransaction, seeded = false) {
  try {
    const response = await fetch("/api/transactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(transaction) });
    if (!response.ok) return;
    writeTransactionOutbox(readTransactionOutbox().filter((pending) => pending.idempotencyKey !== transaction.idempotencyKey));
    if (seeded && typeof window.localStorage?.setItem === "function") {
      const synced = readSyncedSeedTransactions();
      synced.add(transaction.idempotencyKey);
      window.localStorage.setItem(SYNCED_SEED_TRANSACTIONS_KEY, JSON.stringify([...synced]));
    }
  } catch { /* The local copy remains queued for the next retry. */ }
}

function withVegetableOrder(current: ShopState, order: VegetableOrder, setAsPrimaryRates: boolean) {
  const primaryRates = setAsPrimaryRates ? primaryRatesFromOrder(order) : [];
  return {
    ...current,
    vegetableOrders: [...current.vegetableOrders.filter((candidate) => candidate.id !== order.id && candidate.businessDate !== order.businessDate), order],
    vendorItemRates: primaryRates.length ? [
      ...current.vendorItemRates.filter((existing) => !primaryRates.some((rate) => rate.vendorId === existing.vendorId && rate.itemName.toLocaleLowerCase("en-IN") === existing.itemName.toLocaleLowerCase("en-IN") && rate.unit === existing.unit)),
      ...primaryRates,
    ] : current.vendorItemRates,
  };
}

interface ShopStoreValue {
  state: ShopState;
  operationsSyncPending: number;
  operationsSyncStatus: "idle" | "syncing" | "retrying" | "synced";
  addTransaction: (transaction: NewShopTransaction) => Promise<void>;
  saveVegetableOrder: (order: VegetableOrder, setAsPrimaryRates?: boolean) => Promise<void>;
  deleteVegetableOrder: (id: string) => Promise<void>;
  updateCylinder: (id: string, updates: Partial<LpgCylinder>) => Promise<void>;
  saveLpgRefill: (event: LpgRefillEvent) => Promise<void>;
  updateLpgPricing: (pricing: LpgPricing) => Promise<void>;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  updateAdvancePayment: (id: string, updates: Partial<AdvancePayment>) => Promise<void>;
  updateRecurringRent: (id: string, updates: Partial<RecurringRent>) => Promise<void>;
  closeDay: (businessDate: string, countedCash: string, note: string) => void;
  resetDemo: () => void;
}

const ShopStoreContext = createContext<ShopStoreValue | null>(null);

export function ShopStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShopState>(() => createDemoState());
  const [operationsSyncPending, setOperationsSyncPending] = useState(0);
  const [operationsSyncStatus, setOperationsSyncStatus] = useState<ShopStoreValue["operationsSyncStatus"]>("idle");
  const storageReady = useRef(false);
  const mongoMode = process.env.NEXT_PUBLIC_DATA_MODE === "mongodb";

  useEffect(() => {
    if (typeof window.localStorage?.getItem !== "function") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ShopState;
        const defaults = createDemoState();
        const requiredInvestments = defaults.transactions.filter((transaction) => transaction.kind === "expense" && transaction.expenseType === "investment");
        queueMicrotask(() => {
          setState({
            ...defaults,
            ...parsed,
            lpgPricing: parsed.lpgPricing ?? defaults.lpgPricing,
            lpgRefills: parsed.lpgRefills ?? [],
            vendorItemRates: parsed.vendorItemRates ?? defaults.vendorItemRates,
            transactions: [...(parsed.transactions ?? []), ...requiredInvestments.filter((required) => !(parsed.transactions ?? []).some((existing) => existing.idempotencyKey === required.idempotencyKey))],
          });
          storageReady.current = true;
        });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        storageReady.current = true;
      }
    } else storageReady.current = true;
  }, []);

  useEffect(() => {
    if (!mongoMode) return;
    const pendingOperations = readOperationsOutbox();
    queueMicrotask(() => setOperationsSyncPending(pendingOperations.length));
    void fetch("/api/operations")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load shop operations")))
      .then((payload: { data: Pick<ShopState, "vegetableOrders" | "vendorItemRates" | "cylinders" | "lpgRefills" | "lpgPricing" | "staff" | "advancePayments" | "recurringRents"> }) => setState((current) => {
        const loaded = { ...current, ...payload.data };
        return pendingOperations.reduce((next, pending) => withVegetableOrder(next, pending.data, pending.setAsPrimaryRates), loaded);
      }))
      .catch(() => undefined);
    if (pendingOperations.length) {
      queueMicrotask(() => setOperationsSyncStatus("syncing"));
      void Promise.all(pendingOperations.map(syncVegetableOrder)).then(() => {
        const remaining = readOperationsOutbox().length;
        setOperationsSyncPending(remaining);
        setOperationsSyncStatus(remaining ? "retrying" : "synced");
      });
    }
  }, [mongoMode]);

  useEffect(() => {
    if (!mongoMode) return;
    const requiredInvestments = createDemoState().transactions.filter((transaction) => SEEDED_INVESTMENT_IDS.has(transaction.id));
    const syncedSeeds = readSyncedSeedTransactions();
    for (const required of requiredInvestments) if (!syncedSeeds.has(required.idempotencyKey)) queueTransactionSync(required);
    const pendingTransactions = readTransactionOutbox();
    void fetch("/api/transactions?shopId=main-shop")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load MongoDB transactions")))
      .then((payload: { data: ShopTransaction[] }) => setState((current) => ({
        ...current,
        transactions: [...payload.data.filter((saved) => !pendingTransactions.some((pending) => pending.idempotencyKey === saved.idempotencyKey)), ...pendingTransactions],
      })))
      .catch(() => undefined);
    for (const pending of pendingTransactions) void syncTransaction(pending, SEEDED_INVESTMENT_IDS.has(pending.id));
  }, [mongoMode]);

  useEffect(() => {
    if (!mongoMode) return;
    function retryPendingWrites() {
      const pendingOperations = readOperationsOutbox();
      setOperationsSyncPending(pendingOperations.length);
      if (pendingOperations.length) {
        setOperationsSyncStatus("syncing");
        void Promise.all(pendingOperations.map(syncVegetableOrder)).then(() => {
          const remaining = readOperationsOutbox().length;
          setOperationsSyncPending(remaining);
          setOperationsSyncStatus(remaining ? "retrying" : "synced");
        });
      }
      for (const pending of readTransactionOutbox()) void syncTransaction(pending, SEEDED_INVESTMENT_IDS.has(pending.id));
    }
    window.addEventListener("online", retryPendingWrites);
    const interval = window.setInterval(retryPendingWrites, 15_000);
    return () => {
      window.removeEventListener("online", retryPendingWrites);
      window.clearInterval(interval);
    };
  }, [mongoMode]);

  useEffect(() => {
    if (storageReady.current && typeof window.localStorage?.setItem === "function") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<ShopStoreValue>(() => ({
    state,
    operationsSyncPending,
    operationsSyncStatus,
    addTransaction: async (transaction) => {
      if (isBusinessDateClosed(state.closings, transaction.businessDate)) {
        throw new Error("This business date is closed. Post a dated correction instead.");
      }
      const id = crypto.randomUUID();
      const saved = {
        ...transaction,
        id,
        shopId: "main-shop",
        createdAt: new Date().toISOString(),
        createdBy: "owner",
        idempotencyKey: id,
      } as ShopTransaction;
      setState((current) => ({ ...current, transactions: [...current.transactions, saved] }));
      if (mongoMode) {
        queueTransactionSync(saved);
        void syncTransaction(saved);
      }
    },
    saveVegetableOrder: async (order, setAsPrimaryRates = false) => {
      setState((current) => withVegetableOrder(current, order, setAsPrimaryRates));
      if (mongoMode) {
        const payload: VegetableOrderSync = { entity: "vegetableOrder", data: order, setAsPrimaryRates };
        queueVegetableOrderSync(payload);
        setOperationsSyncPending(readOperationsOutbox().length);
        setOperationsSyncStatus("syncing");
        void syncVegetableOrder(payload).then((synced) => {
          const remaining = readOperationsOutbox().length;
          setOperationsSyncPending(remaining);
          setOperationsSyncStatus(remaining ? "retrying" : synced ? "synced" : "idle");
        });
      }
    },
    deleteVegetableOrder: async (id) => {
      if (mongoMode) {
        const response = await fetch(`/api/operations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("The vegetable order could not be deleted");
      }
      setState((current) => ({ ...current, vegetableOrders: current.vegetableOrders.filter((order) => order.id !== id) }));
    },
    updateCylinder: async (id, updates) => {
      const existing = state.cylinders.find((cylinder) => cylinder.id === id);
      if (!existing) return;
      const saved = { ...existing, ...updates };
      if (mongoMode) {
        const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "lpgCylinder", data: saved }) });
        if (!response.ok) throw new Error("The cylinder could not be saved");
      }
      setState((current) => ({ ...current, cylinders: current.cylinders.map((cylinder) => cylinder.id === id ? saved : cylinder) }));
    },
    saveLpgRefill: async (event) => {
      if (mongoMode) {
        const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "lpgRefillEvent", data: event }) });
        if (!response.ok) throw new Error("The LPG refill could not be saved");
      }
      setState((current) => ({ ...current, lpgRefills: [...current.lpgRefills.filter((candidate) => candidate.id !== event.id), event] }));
    },
    updateLpgPricing: async (pricing) => {
      if (mongoMode) {
        const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "lpgPricing", data: pricing }) });
        if (!response.ok) throw new Error("The LPG pricing could not be saved");
      }
      setState((current) => ({ ...current, lpgPricing: pricing }));
    },
    updateStaffMember: async (id, updates) => {
      const existing = state.staff.find((member) => member.id === id);
      if (!existing) return;
      const saved = { ...existing, ...updates };
      if (mongoMode) {
        const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "staffMember", data: saved }) });
        if (!response.ok) throw new Error("The salary record could not be saved");
      }
      setState((current) => ({ ...current, staff: current.staff.map((member) => member.id === id ? saved : member) }));
    },
    updateAdvancePayment: async (id, updates) => {
      const existing = state.advancePayments.find((advance) => advance.id === id);
      if (!existing) return;
      const saved = { ...existing, ...updates };
      if (mongoMode) {
        const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "advancePayment", data: saved }) });
        if (!response.ok) throw new Error("The advance payment could not be saved");
      }
      setState((current) => ({ ...current, advancePayments: current.advancePayments.map((advance) => advance.id === id ? saved : advance) }));
    },
    updateRecurringRent: async (id, updates) => {
      const existing = state.recurringRents.find((rent) => rent.id === id);
      if (!existing) return;
      const saved = { ...existing, ...updates };
      if (mongoMode) {
        const response = await fetch("/api/operations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "recurringRent", data: saved }) });
        if (!response.ok) throw new Error("The rent record could not be saved");
      }
      setState((current) => ({ ...current, recurringRents: current.recurringRents.map((rent) => rent.id === id ? saved : rent) }));
    },
    closeDay: (businessDate, countedCash, note) => setState((current) => ({
      ...current,
      closings: [
        ...current.closings.filter((closing) => closing.businessDate !== businessDate),
        { businessDate, status: "closed", countedCash, note, closedAt: new Date().toISOString() },
      ],
    })),
    resetDemo: () => setState(createDemoState()),
  }), [mongoMode, operationsSyncPending, operationsSyncStatus, state]);

  return <ShopStoreContext.Provider value={value}>{children}</ShopStoreContext.Provider>;
}

export function useShopStore() {
  const value = useContext(ShopStoreContext);
  if (!value) throw new Error("useShopStore must be used inside ShopStoreProvider");
  return value;
}
