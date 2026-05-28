import { PaymentEntity, PaymentLens, PaymentSummary } from "../data/paymentData";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatShare,
  formatSignedCurrency,
} from "../lib/format";

const lensColors: Record<PaymentLens, string> = {
  Vendor: "#2563eb",
  Agency: "#0f766e",
  Category: "#b45309",
};

export function YearTrendChart({
  summaries,
  selectedYear,
}: {
  summaries: PaymentSummary[];
  selectedYear: number;
}) {
  const width = 760;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxTotal = Math.max(...summaries.map((summary) => summary.totalAmount));
  const barWidth = 120;

  return (
    <section className="chart-panel" aria-label="Payment trend by fiscal year">
      <div className="chart-heading">
        <div>
          <h2>Payment trend</h2>
          <p>Workbook totals by fiscal year</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <title>Washington vendor payment totals for fiscal years 2022 and 2023</title>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padding.top + chartHeight - tick * chartHeight;
          const value = maxTotal * tick;

          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#d7dee8"
                strokeDasharray={tick === 0 ? "0" : "4 5"}
              />
              <text x={8} y={y + 4} className="chart-tick">
                {formatCurrency(value)}
              </text>
            </g>
          );
        })}

        {summaries.map((summary, index) => {
          const laneWidth = chartWidth / summaries.length;
          const x = padding.left + index * laneWidth + (laneWidth - barWidth) / 2;
          const barHeight = (summary.totalAmount / maxTotal) * chartHeight;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g key={summary.fiscalYear}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={5}
                fill={summary.fiscalYear === selectedYear ? "#2563eb" : "#9fb0c6"}
              >
                <title>
                  {`FY${summary.fiscalYear}: ${formatCurrency(
                    summary.totalAmount,
                  )}`}
                </title>
              </rect>
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="chart-value">
                {formatCurrency(summary.totalAmount)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 14}
                textAnchor="middle"
                className={
                  summary.fiscalYear === selectedYear ? "chart-year active" : "chart-year"
                }
              >
                FY{summary.fiscalYear}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function TopEntitiesChart({
  rows,
  lens,
}: {
  rows: PaymentEntity[];
  lens: PaymentLens;
}) {
  const visibleRows = rows.slice(0, 8);
  const maxAmount = Math.max(...visibleRows.map((row) => row.amount));

  return (
    <section className="chart-panel" aria-label={`Top ${lens.toLowerCase()} payments`}>
      <div className="chart-heading">
        <div>
          <h2>Top {lens.toLowerCase()} totals</h2>
          <p>Ranked by payment amount</p>
        </div>
      </div>

      <div className="bar-list">
        {visibleRows.map((row) => (
          <div className="bar-row" key={`${row.lens}-${row.name}`}>
            <div className="bar-row-label">
              <span>{row.name}</span>
              <strong>{formatCurrency(row.amount)}</strong>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(row.amount / maxAmount) * 100}%`,
                  background: lensColors[lens],
                }}
              />
            </div>
            <p>
              {formatShare(row.shareOfYear)} of year total, {formatNumber(row.recordCount)} rows
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MovementChart({
  rows,
  selectedYear,
}: {
  rows: PaymentEntity[];
  selectedYear: number;
}) {
  const movers = rows
    .filter((row) => row.yoyAmount !== null)
    .slice()
    .sort((first, second) => Math.abs(second.yoyAmount ?? 0) - Math.abs(first.yoyAmount ?? 0))
    .slice(0, 6);
  const maxChange = Math.max(1, ...movers.map((row) => Math.abs(row.yoyAmount ?? 0)));

  return (
    <section className="chart-panel" aria-label="Year over year movement">
      <div className="chart-heading">
        <div>
          <h2>What moved</h2>
          <p>Change from prior fiscal year</p>
        </div>
      </div>

      {movers.length === 0 ? (
        <div className="empty-state">
          FY{selectedYear} is the first year in the provided workbook.
        </div>
      ) : (
        <div className="change-list">
          {movers.map((row) => {
            const change = row.yoyAmount ?? 0;
            const width = `${(Math.abs(change) / maxChange) * 100}%`;

            return (
              <div className="change-row" key={`${row.lens}-${row.name}-change`}>
                <div className="change-copy">
                  <span>{row.name}</span>
                  <strong>
                    {formatSignedCurrency(row.yoyAmount)}{" "}
                    <small>{formatPercent(row.yoyPercent)}</small>
                  </strong>
                </div>
                <div className="change-track">
                  <div
                    className={change >= 0 ? "change-fill up" : "change-fill down"}
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
