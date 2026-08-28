# Samosa & Co. Shop Manager

A mobile-first operations ledger for a samosa and kathi-roll shop. It records dated facts and derives stock, cash flow, receivables, operating profit, and daily summaries without using floating-point arithmetic for persisted values.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

The configured data mode controls whether transaction records come from MongoDB or browser storage. Use **More → Restore demonstration data** to reset the in-browser state.

## MongoDB Atlas mode

Copy `.env.example` to `.env.local`, set your Atlas connection, then initialize the database:

```bash
npm run db:setup
```

The setup is safe to rerun. It creates the operational collections and indexes, inserts missing demonstration data without overwriting existing records, and performs a temporary write/read/delete connection check. Enable the connected UI with:

```dotenv
NEXT_PUBLIC_DATA_MODE=mongodb
```

The transaction API also maintains its required idempotency and reporting indexes automatically. Monetary and measured values are validated as decimal strings at the HTTP boundary and stored as MongoDB `Decimal128`.

MongoDB mode currently covers the authoritative sales, purchase, inventory, expense, customer-payment, vegetable-order, vendor-rate, advance, rent, LPG, and salary records. Vegetable rates can remain pending and be filled in later through the Inventory editor; line and order totals are then calculated automatically.

Each vegetable order keeps its dated rate as a historical snapshot. The order editor can also promote the entered rates to the selected vendor’s primary rates. Those values prefill future orders and can be replaced whenever the vendor price changes without rewriting older orders.

Customer payments use oldest-sale-first allocation. The dashboard and Reports page show the last fully paid sales date, partial dates, and the remaining balance. A payment can be recorded against a selected “close sales through” date; the suggested amount can still be adjusted for a partial payment.

LPG pricing is editable under More. The demonstration defaults are ₹4,600 initial cost per cylinder and ₹2,600 per refill. The existing ₹4,000 two-cylinder advance remains a separate paid commitment. Each refill captures the cylinder lifecycle dates and can be saved as due, then marked paid later with its payment date and method.

## Quality commands

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Domain rules

- Business date and entry timestamp are separate.
- Quantities retain both their entered unit and a normalized base unit.
- Purchases add stock; consumption and wastage remove it.
- Credit sales and customer payments reconcile independently.
- Customer receipts close credit sales oldest-first; the stored settlement date remains available for audit.
- LPG advances, configured cylinder prices, and refill payments remain distinct.
- Cash flow is reported separately from operating profit.
- Closed business dates reject ordinary new entries.
- MongoDB writes use client idempotency keys to prevent duplicate retry postings.
- No financial or inventory calculation relies on ordinary JavaScript floating-point arithmetic.

## Production gates

Before using this with live financial records, configure authentication/roles, persist daily closings and remaining master-data workflows server-side, test backups and restoration, and complete a seven-day reconciliation pilot against the shop's manual records.
