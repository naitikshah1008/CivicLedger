import { FormEvent, useMemo, useState } from "react";
import {
  MovementChart,
  TopEntitiesChart,
  YearTrendChart,
} from "./components/Charts";
import { MetricCard } from "./components/MetricCard";
import {
  FiscalYear,
  PaymentLens,
  fiscalYears,
  paymentLenses,
  paymentSummaries,
  sourceWorkbookName,
} from "./data/paymentData";
import {
  QuestionId,
  buildInsightContext,
  generatePaymentBriefing,
  interpretPlainEnglishQuestion,
  questionOptions,
} from "./lib/insights";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatShare,
  formatSignedCurrency,
} from "./lib/format";

function App() {
  const [selectedYear, setSelectedYear] = useState<FiscalYear>(2023);
  const [lens, setLens] = useState<PaymentLens>("Vendor");
  const [questionId, setQuestionId] = useState<QuestionId>("top-vendors");
  const [plainQuestion, setPlainQuestion] = useState("");
  const [matchedIntent, setMatchedIntent] = useState("");

  const context = useMemo(
    () => buildInsightContext(selectedYear, lens),
    [selectedYear, lens],
  );
  const briefing = useMemo(
    () => generatePaymentBriefing(questionId, context),
    [questionId, context],
  );
  const yoyTone =
    context.totalYoyAmount === null
      ? "neutral"
      : context.totalYoyAmount >= 0
        ? "positive"
        : "warning";

  function handlePlainQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!plainQuestion.trim()) {
      return;
    }

    const interpretation = interpretPlainEnglishQuestion(
      plainQuestion,
      selectedYear,
      lens,
    );

    setQuestionId(interpretation.questionId);
    setSelectedYear(interpretation.selectedYear);
    setLens(interpretation.lens);
    setMatchedIntent(interpretation.matchedIntent);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Golden Analytics POC</p>
          <h1>Golden Vendor Payment Briefing</h1>
          <p className="subtitle">
            Plain-English answers from Washington vendor payment records.
          </p>
        </div>
        <div className="source-chip" title={sourceWorkbookName}>
          FY2022-FY2023 workbook aggregate
        </div>
      </header>

      <section className="ask-panel" aria-label="Plain English question router">
        <form className="ask-form" onSubmit={handlePlainQuestionSubmit}>
          <label>
            Plain-English question
            <input
              value={plainQuestion}
              onChange={(event) => setPlainQuestion(event.target.value)}
              placeholder="Which vendors changed most in 2023?"
            />
          </label>
          <button type="submit">Ask</button>
        </form>
        {matchedIntent ? <p className="matched-intent">{matchedIntent}</p> : null}
      </section>

      <section className="control-strip" aria-label="Briefing controls">
        <label>
          Question
          <select
            value={questionId}
            onChange={(event) => setQuestionId(event.target.value as QuestionId)}
          >
            {questionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fiscal year
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value) as FiscalYear)}
          >
            {[...fiscalYears].reverse().map((year) => (
              <option key={year} value={year}>
                FY{year}
              </option>
            ))}
          </select>
        </label>

        <label>
          Show me
          <select
            value={lens}
            onChange={(event) => setLens(event.target.value as PaymentLens)}
          >
            {paymentLenses.map((paymentLens) => (
              <option key={paymentLens} value={paymentLens}>
                {paymentLens}s
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="briefing-panel" aria-label="Plain English answer">
        <div className="briefing-copy">
          <p className="eyebrow">{briefing.eyebrow}</p>
          <h2>{briefing.headline}</h2>
          <p>{briefing.summary}</p>
        </div>

        <div className="evidence-list">
          {briefing.evidence.map((item) => (
            <div className="evidence-item" key={item}>
              <span />
              <p>{item}</p>
            </div>
          ))}
        </div>

        <div className="next-step">
          <strong>Look next</strong>
          <p>{briefing.nextStep}</p>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Key figures">
        <MetricCard
          label="Total payments"
          value={formatCurrency(context.summary.totalAmount)}
          detail={`${formatNumber(context.summary.recordCount)} payment rows`}
        />
        <MetricCard
          label="Unique vendors"
          value={formatNumber(context.summary.vendorCount)}
          detail={`${formatNumber(context.summary.agencyCount)} agencies in FY${selectedYear}`}
        />
        <MetricCard
          label="Top agency"
          value={context.topAgency.name}
          detail={formatCurrency(context.topAgency.amount)}
        />
        <MetricCard
          label="Year-over-year"
          value={formatSignedCurrency(context.totalYoyAmount)}
          detail={formatPercent(context.totalYoyPercent)}
          tone={yoyTone}
        />
      </section>

      <section className="chart-grid">
        <YearTrendChart summaries={paymentSummaries} selectedYear={selectedYear} />
        <TopEntitiesChart rows={context.selectedRows} lens={lens} />
        <MovementChart rows={context.selectedRows} selectedYear={selectedYear} />
      </section>

      <section className="detail-panel">
        <div className="detail-heading">
          <div>
            <h2>Supporting rows</h2>
            <p>Top {lens.toLowerCase()} aggregates behind the briefing</p>
          </div>
          <span>
            Source: {sourceWorkbookName}. Raw workbook is summarized into app-ready
            aggregates.
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>{lens}</th>
                <th>Payments</th>
                <th>Share</th>
                <th>Rows</th>
                <th>Change from prior year</th>
              </tr>
            </thead>
            <tbody>
              {context.selectedRows.slice(0, 10).map((row) => (
                <tr key={`${row.lens}-${row.name}`}>
                  <td>{row.rank}</td>
                  <td>{row.name}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{formatShare(row.shareOfYear)}</td>
                  <td>{formatNumber(row.recordCount)}</td>
                  <td>
                    {formatSignedCurrency(row.yoyAmount)}{" "}
                    <span className="muted">{formatPercent(row.yoyPercent)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
