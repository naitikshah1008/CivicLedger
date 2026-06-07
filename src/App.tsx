import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  MovementChart,
  TopEntitiesChart,
  YearTrendChart,
} from "./components/Charts";
import { MetricCard } from "./components/MetricCard";
import {
  FiscalYear,
  PaymentDataSource,
  PaymentLens,
  defaultVendorPaymentSource,
  paymentLenses,
} from "./data/paymentData";
import {
  QuestionId,
  buildInsightContext,
  generatePaymentBriefing,
  interpretPlainEnglishQuestion,
  questionOptions,
} from "./lib/insights";
import { importPaymentFile } from "./lib/importPayments";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatShare,
  formatSignedCurrency,
} from "./lib/format";

function App() {
  const [sources, setSources] = useState<PaymentDataSource[]>([
    defaultVendorPaymentSource,
  ]);
  const [activeSourceId, setActiveSourceId] = useState(
    defaultVendorPaymentSource.id,
  );
  const [selectedYear, setSelectedYear] = useState<FiscalYear>(2023);
  const [lens, setLens] = useState<PaymentLens>("Vendor");
  const [questionId, setQuestionId] = useState<QuestionId>("top-vendors");
  const [plainQuestion, setPlainQuestion] = useState("");
  const [matchedIntent, setMatchedIntent] = useState("");
  const [importStatus, setImportStatus] = useState("");

  const activeSource = useMemo(
    () =>
      sources.find((source) => source.id === activeSourceId) ??
      defaultVendorPaymentSource,
    [activeSourceId, sources],
  );
  const sourceYears = useMemo(
    () =>
      activeSource.summaries
        .map((summary) => summary.fiscalYear)
        .sort((first, second) => first - second),
    [activeSource],
  );

  useEffect(() => {
    if (!sourceYears.includes(selectedYear) && sourceYears.length > 0) {
      setSelectedYear(sourceYears[sourceYears.length - 1]);
    }
  }, [selectedYear, sourceYears]);

  const context = useMemo(
    () => buildInsightContext(activeSource, selectedYear, lens),
    [activeSource, selectedYear, lens],
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

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImportStatus(`Importing ${file.name}...`);

    try {
      const importedSource = await importPaymentFile(file);
      const importedYears = importedSource.summaries.map(
        (summary) => summary.fiscalYear,
      );

      setSources((currentSources) => [
        importedSource,
        ...currentSources.filter((source) => source.id !== importedSource.id),
      ]);
      setActiveSourceId(importedSource.id);
      setSelectedYear(Math.max(...importedYears));
      setLens("Vendor");
      setQuestionId("top-vendors");
      setMatchedIntent("");
      setImportStatus(
        `Imported ${importedSource.sourceLabel}: ${formatNumber(
          importedSource.summaries.reduce(
            (total, summary) => total + summary.recordCount,
            0,
          ),
        )} rows normalized.`,
      );
    } catch (error) {
      setImportStatus(
        error instanceof Error
          ? error.message
          : "The file could not be imported.",
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CivicLedger workspace</p>
          <h1>CivicLedger</h1>
          <p className="subtitle">
            Plain-English payment intelligence across public spending files.
          </p>
        </div>
        <div className="source-chip" title={activeSource.description}>
          {activeSource.sourceLabel}
        </div>
      </header>

      <section className="source-panel" aria-label="Data source manager">
        <label>
          Dataset
          <select
            value={activeSourceId}
            onChange={(event) => setActiveSourceId(event.target.value)}
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Import file
          <input
            className="file-input"
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileImport}
          />
        </label>

        <div className="source-summary">
          <strong>{activeSource.name}</strong>
          <span>
            {formatNumber(
              activeSource.summaries.reduce(
                (total, summary) => total + summary.recordCount,
                0,
              ),
            )}{" "}
            rows across {activeSource.summaries.length} fiscal years
          </span>
        </div>
        {importStatus ? <p className="import-status">{importStatus}</p> : null}
      </section>

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
            {[...sourceYears].reverse().map((year) => (
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
        <YearTrendChart summaries={activeSource.summaries} selectedYear={selectedYear} />
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
            Source: {activeSource.sourceLabel}. Raw files are summarized into app-ready
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
