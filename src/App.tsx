import { useMemo, useState } from "react";
import { ChangeChart, FundBreakdownChart, TrendChart } from "./components/Charts";
import { MetricCard } from "./components/MetricCard";
import {
  FundFilter,
  dataSource,
  fiscalYears,
  fundTypes,
} from "./data/budgetData";
import {
  QuestionId,
  buildInsightContext,
  generateBudgetBriefing,
  questionOptions,
} from "./lib/insights";
import {
  formatBillions,
  formatPercent,
  formatShare,
  formatSignedBillions,
} from "./lib/format";

function App() {
  const [selectedYear, setSelectedYear] = useState(
    fiscalYears[fiscalYears.length - 1],
  );
  const [fundFilter, setFundFilter] = useState<FundFilter>("All funds");
  const [questionId, setQuestionId] = useState<QuestionId>("changed-most");

  const context = useMemo(
    () => buildInsightContext(selectedYear, fundFilter),
    [selectedYear, fundFilter],
  );
  const briefing = useMemo(
    () => generateBudgetBriefing(questionId, context),
    [questionId, context],
  );

  const yoyTone =
    context.yoyAmount === null
      ? "neutral"
      : context.yoyAmount >= 0
        ? "positive"
        : "warning";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Golden Analytics POC</p>
          <h1>Golden Budget Briefing</h1>
          <p className="subtitle">
            Plain-English answers from Washington fiscal spending data.
          </p>
        </div>
        <div className="source-chip" title={dataSource}>
          FY2019-FY2025 source snapshot
        </div>
      </header>

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
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          >
            {[...fiscalYears].reverse().map((year) => (
              <option key={year} value={year}>
                FY{year}
              </option>
            ))}
          </select>
        </label>

        <label>
          Spending view
          <select
            value={fundFilter}
            onChange={(event) => setFundFilter(event.target.value as FundFilter)}
          >
            <option value="All funds">All funds</option>
            {fundTypes.map((fundType) => (
              <option key={fundType} value={fundType}>
                {fundType}
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
          label="Selected spending"
          value={formatBillions(context.selectedTotal)}
          detail={`${formatShare(
            context.selectedShareOfYear,
          )} of FY${selectedYear} total`}
        />
        <MetricCard
          label="Year-over-year"
          value={formatSignedBillions(context.yoyAmount)}
          detail={formatPercent(context.yoyPercent)}
          tone={yoyTone}
        />
        <MetricCard
          label="Largest fund bucket"
          value={context.largestFund.fundType}
          detail={`${formatBillions(context.largestFund.amountBillions)} in FY${selectedYear}`}
        />
        <MetricCard
          label="Non-general share"
          value={formatShare(context.nonGeneralShare)}
          detail="Other state, federal, and bond funds"
        />
      </section>

      <section className="chart-grid">
        <TrendChart selectedYear={selectedYear} />
        <FundBreakdownChart breakdown={context.fundBreakdown} />
        <ChangeChart breakdown={context.fundBreakdown} />
      </section>

      <section className="detail-panel">
        <div className="detail-heading">
          <div>
            <h2>Supporting rows</h2>
            <p>Evidence behind the briefing</p>
          </div>
          <span>{dataSource}</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fiscal year</th>
                <th>Fund bucket</th>
                <th>Spending</th>
                <th>Share of year</th>
                <th>Change from prior year</th>
              </tr>
            </thead>
            <tbody>
              {context.fundBreakdown.map((fund) => (
                <tr key={fund.fundType}>
                  <td>FY{selectedYear}</td>
                  <td>{fund.fundType}</td>
                  <td>{formatBillions(fund.amountBillions)}</td>
                  <td>{formatShare(fund.shareOfYear)}</td>
                  <td>
                    {formatSignedBillions(fund.yoyAmount)}{" "}
                    <span className="muted">{formatPercent(fund.yoyPercent)}</span>
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
