# CivicLedger

CivicLedger is a React and TypeScript web app for turning public spending files into plain-English payment intelligence.

The app starts with a built-in public vendor-payment sample and can import additional `.xlsx` or `.csv` files. When the local API is running, uploads are parsed server-side and saved as reusable dataset aggregates. If the API is offline, the frontend falls back to browser-only import.

## Features

- Built-in public vendor payment aggregate
- Backend-backed import for XLSX and CSV spending files
- Browser-only import fallback when the API is offline
- Dataset switcher for working across multiple sources
- Plain-English question routing
- Fiscal year, vendor, agency, and category views
- Year-over-year movement analysis
- Top vendor, agency, and category rankings
- Input logging for intelligent routing and briefing generation

Source workbook: [Public payment sample data](https://provnco.sharepoint.com/:x:/s/Technology/IQCgqYJsp95jRKMYstu_QckkAQmtG_6nt1LD-G3Ry4ombuI?rtime=L2iELoa83kg)

## Import Format

CivicLedger looks for common payment-file columns:

- fiscal year: `FY`, `Fiscal Year`, `Year`
- agency: `Agency`, `Department`, `Office`
- category: `Category`, `Object`, `Spending Category`
- subcategory: `SubCategory`, `Subobj`, `Sub Object`
- vendor: `Vendor`, `Supplier`, `Payee`, `Recipient`
- amount: `Amount`, `Payment Amount`, `Spend`, `Value`

Rows without a fiscal year or amount are skipped. Missing agency, category, vendor, or subcategory values are grouped as unknown or uncategorized.

## Architecture

- `src/data/paymentData.ts` contains the built-in payment aggregate.
- `server/index.mjs` provides the local upload and dataset API.
- `.civicledger/` stores local uploads and generated dataset aggregates.
- `src/lib/backendDatasets.ts` connects the frontend to the local API.
- `src/lib/importPayments.ts` parses uploaded Excel and CSV files.
- `src/lib/aggregatePayments.ts` converts normalized rows into summaries and ranked entities.
- `src/lib/insights.ts` handles question routing and briefing generation.
- `src/lib/governance.ts` logs inputs to intelligent components.
- `src/components/Charts.tsx` renders lightweight SVG charts without a charting library.

The Excel parser is lazy-loaded only when a user imports a file, keeping the initial app bundle smaller. The same aggregation shape is used by the browser fallback and the backend API.

## Governance Logging

CivicLedger does not call a live AI model. It uses deterministic question routing and briefing generation. Inputs to those intelligent layers are logged with:

```ts
console.info("INTELLIGENT_COMPONENT_INPUT", payload);
```

The payload is also stored in `sessionStorage` under `civicledger_input_log` during the session.

## Run Locally

Frontend only:

```bash
npm install
npm run dev
```

Frontend with persistent backend imports:

```bash
npm run dev:api
npm run dev
```

Run those commands in separate terminals. The Vite dev server proxies `/api` requests to the local API on port `8787`.

Build:

```bash
npm run build
```
