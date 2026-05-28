# Golden Vendor Payment Briefing

Golden Vendor Payment Briefing is a proof-of-concept web app that turns the provided Washington State vendor-payment workbook into a short, plain-English briefing for a non-technical reviewer.

## Problem

I designed this for a journalist, city councilmember, or policy analyst who needs to understand public spending patterns but does not know SQL, fiscal schemas, or BI tooling.

The pain I chose to solve is the spreadsheet starting problem. The provided SharePoint link resolves to `Vendor-Payments_2021-23.xlsx`, which has more than 900,000 payment rows across FY2022 and FY2023. A non-technical user can open the file, but they still have to know how to group, sort, compare, and explain it. I chose a guided briefing experience over a generic dashboard or open-ended chatbot because the app gives the user useful starting questions and plain-English answers before asking them to interpret tables.

## What I Built

The app lets a user choose:

- a plain-English question
- a fiscal year
- a view: vendors, agencies, or categories

It then updates:

- a short payment briefing
- key metrics
- a fiscal-year trend chart
- top-ranked agency/vendor/category bars
- year-over-year movement bars
- supporting rows for the selected view

The source workbook has these main columns: fiscal year, fiscal month, agency, category, subcategory, vendor, and amount. I embedded app-ready aggregates in `src/data/paymentData.ts` instead of committing the raw 48MB workbook.

Source workbook: [Washington State fiscal data](https://provnco.sharepoint.com/:x:/s/Technology/IQCgqYJsp95jRKMYstu_QckkAQmtG_6nt1LD-G3Ry4ombuI?rtime=L2iELoa83kg)

## Tech And Architecture

- React and TypeScript with Vite for a small, fast web app.
- Aggregated data generated from the provided Excel workbook.
- No charting library. The charts are simple SVG and CSS so the core data logic is easy to inspect.
- Data transformation and briefing generation are isolated in `src/lib/insights.ts`.
- Input logging for the intelligent briefing layer is isolated in `src/lib/governance.ts`.
- The briefing generator is deterministic instead of a live LLM call.

Run locally:

```bash
npm install
npm run dev
```

## Explicit Trade-Offs

1. I embedded aggregates instead of the raw workbook. The workbook is large, and the POC needs a reliable browser demo. In production, I would load the raw data through a governed pipeline and aggregate server-side.

2. I used guided questions instead of a blank chatbot. A blank chat box can be powerful, but it can also make non-technical users responsible for knowing what questions are possible.

3. I used deterministic briefings instead of calling a live model. This keeps the demo reproducible and avoids API key risk. In production, this layer could call an LLM after logging inputs, enforcing access controls, and evaluating outputs.

4. I kept the drill-down shallow: vendors, agencies, and categories. In production, I would add agency-to-category-to-vendor drill-down, search, filters, and raw-row evidence.

## Prototype Vs Production

This POC would need several changes before production:

- Replace the embedded aggregate file with a governed ingestion pipeline and a database.
- Add data freshness checks, workbook versioning, and reconciliation against official source totals.
- Add search and filters for agency, vendor, category, subcategory, and fiscal month.
- Preserve row-level evidence so every generated statement can be traced back to source records.
- Add authentication and role-based access if used for non-public business data.
- Add tests around fiscal calculations, especially year-over-year comparisons and negative adjustments.
- Add accessibility passes for chart descriptions and keyboard navigation.
- If an LLM is used, add persistent input/output logs, retention policy, prompt versioning, and human-readable audit trails.

## AI Usage And Data Handling

The app does not call a live model. It uses a deterministic briefing generator as an AI-ready intelligent layer. Every input to that layer is logged through `logIntelligentComponentInput` before a briefing is generated:

```ts
console.info("INTELLIGENT_COMPONENT_INPUT", payload);
```

The payload is also stored in `sessionStorage` under `golden_analytics_input_log` during the session so a reviewer can inspect what would have been sent to an AI component. The code also attempts to mirror the log on `window.__GOLDEN_ANALYTICS_INPUT_LOG__` when the browser environment allows it.

In production, I would treat this as the model-boundary logging point and extend it to persistent storage with user ID, tenant ID, prompt version, source dataset version, and retention controls.

## AI Collaboration Log

1. Prompt: "Explain the assignment and goals."
   Result: AI clarified that the challenge is about turning fiscal data into answers for non-technical users, not simply making charts.
   Decision: I kept the focus on a specific user and made the app answer a spending question first, with charts as evidence.

2. Prompt: "Suggest what to build as if you were an experienced recruiter."
   Result: AI suggested a guided briefing app and warned against a generic dashboard or chatbot-only experience.
   Decision: I kept the guided briefing direction and rejected a broad BI dashboard because it would not show enough product judgment in the timebox.

3. Prompt: "Use the provided SharePoint dataset link."
   Result: AI identified the workbook as `Vendor-Payments_2021-23.xlsx`, inspected the columns, and suggested pivoting away from the temporary aggregate budget dataset.
   Decision: I changed the app to a vendor-payment briefing, generated compact aggregates from the real workbook, and documented the raw-workbook trade-off.

## Video Walkthrough Notes

- Summary: I built a guided vendor-payment briefing for a non-technical public-sector user who needs fast answers from a large spreadsheet.
- Code walkthrough: show `src/data/paymentData.ts`, `src/lib/insights.ts`, `src/lib/governance.ts`, and `src/App.tsx`.
- Product walkthrough: show how changing the question, fiscal year, or view updates the answer, metrics, charts, and supporting rows.
- Production discussion: explain the embedded aggregates, missing row-level drill-down, missing authentication, and AI governance gaps.
- Mandatory AI question: explain that AI initially helped with a fund-summary app, but I redirected the implementation after inspecting the actual SharePoint workbook and seeing it was vendor-payment data.
