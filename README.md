# Golden Budget Briefing

Golden Budget Briefing is a proof-of-concept web app that turns Washington fiscal spending data into a short, plain-English briefing for a non-technical policy user.

## Problem

I designed this for a city councilmember, journalist, or policy analyst who needs to understand what changed in Washington spending but does not know SQL, fiscal schemas, or BI tooling.

The pain I chose to solve is the blank-page problem. A non-technical user may know they care about public spending, but they may not know whether to start with fund types, fiscal years, or variance analysis. I chose a guided briefing experience over a generic dashboard or open-ended chatbot because the app gives the user useful starting questions and answers before asking them to interpret charts.

## What I Built

The app lets a user choose:

- a plain-English question
- a fiscal year
- a spending view: all funds, General Fund, or non-general funds

It then updates:

- a short budget briefing
- key metrics
- a stacked spending trend chart
- fund breakdown and year-over-year movement charts
- supporting rows for the selected year

The dataset is embedded in `src/data/budgetData.ts`. It uses Washington FY2019-FY2025 expenditure totals from the Urban Institute state fiscal factsheet, which cites NASBO. The source reports general fund spending and total spending. I calculate `Non-general funds` as `total spending - general fund spending`, which combines other state funds, federal funds, and bonds.

Source: https://apps.urban.org/features/slfi-state-pages-prod/factsheets/Washington.html

## Tech And Architecture

- React and TypeScript with Vite for a small, fast web app.
- No charting library. The charts are simple SVG and CSS so the core data logic is easy to inspect.
- Data transformation is isolated in `src/lib/insights.ts`.
- Input logging for the intelligent briefing layer is isolated in `src/lib/governance.ts`.
- The briefing generator is deterministic instead of a live LLM call.

Run locally:

```bash
npm install
npm run dev
```

## Explicit Trade-Offs

1. I embedded a compact data snapshot instead of wiring Postgres. The prompt allowed file-based or embedded data, and the POC needed a reliable demo more than database infrastructure.

2. I used a guided question flow instead of a blank chatbot. A blank chat box can be powerful, but it can also make non-technical users responsible for knowing what questions are possible.

3. I used deterministic briefings instead of calling a live model. This keeps the demo reproducible and avoids API key risk. In production, this layer could call an LLM after logging inputs, enforcing access controls, and evaluating outputs.

4. I combined all non-general dollars into one bucket because the source provides general fund and total spending. In production, I would split this into federal funds, other state funds, and bonds using the canonical fiscal dataset.

## Prototype Vs Production

This POC would need several changes before production:

- Replace the embedded snapshot with a governed data pipeline, likely Postgres-backed aggregation tables.
- Split non-general funds into more precise fund types.
- Add source freshness, data validation, and reconciliation against official fiscal releases.
- Add authentication and role-based access if users are viewing non-public business data.
- Add tests around fiscal calculations, especially year-over-year comparisons and missing-year behavior.
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
   Decision: I kept the focus on a specific user and made the app answer a budget question first, with charts as evidence.

2. Prompt: "Suggest what to build as if you were an experienced recruiter."
   Result: AI suggested a guided budget briefing app and warned against a generic dashboard or chatbot-only experience.
   Decision: I kept the guided briefing direction and rejected a broad BI dashboard because it would not show enough product judgment in the timebox.

3. Prompt: "Start making this."
   Result: AI helped identify a practical data source and implementation structure.
   Decision: I changed the data strategy to use a compact NASBO/Urban source snapshot because the original challenge dataset link was not present in the workspace. I documented the derived non-general bucket as a prototype trade-off.

## Video Walkthrough Notes

- Summary: I built a guided budget briefing for a non-technical public-sector user who needs fast answers from fiscal data.
- Code walkthrough: show `src/data/budgetData.ts`, `src/lib/insights.ts`, `src/lib/governance.ts`, and `src/App.tsx`.
- Product walkthrough: show how changing the year, question, or spending view updates the answer and charts.
- Production discussion: explain the embedded data, combined non-general bucket, missing authentication, and AI governance gaps.
- Mandatory AI question: explain that AI suggested broad directions, but I redirected away from a generic dashboard/chatbot toward guided questions because non-technical users need starting points.
