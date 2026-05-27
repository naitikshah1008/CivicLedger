import { budgetRecords, fiscalYears, fundTypes } from "../data/budgetData";
import { FundBreakdown } from "../lib/insights";
import { formatBillions, formatPercent, formatSignedBillions } from "../lib/format";

const fundColors = {
  "General Fund": "#2563eb",
  "Non-general funds": "#059669",
};

export function TrendChart({ selectedYear }: { selectedYear: number }) {
  const width = 760;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 40, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const totals = fiscalYears.map((year) => {
    const total = budgetRecords
      .filter((record) => record.fiscalYear === year)
      .reduce((sum, record) => sum + record.amountBillions, 0);

    return { year, total };
  });
  const maxTotal = Math.max(...totals.map((total) => total.total));
  const barWidth = chartWidth / fiscalYears.length - 18;

  return (
    <section className="chart-panel" aria-label="Spending trend by fiscal year">
      <div className="chart-heading">
        <div>
          <h2>Spending trend</h2>
          <p>Stacked by fund bucket</p>
        </div>
        <div className="legend">
          {fundTypes.map((fundType) => (
            <span key={fundType}>
              <i style={{ background: fundColors[fundType] }} />
              {fundType}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <title>Washington spending trend from fiscal year 2019 to 2025</title>
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
                {formatBillions(value)}
              </text>
            </g>
          );
        })}

        {fiscalYears.map((year, index) => {
          const x =
            padding.left +
            index * (chartWidth / fiscalYears.length) +
            (chartWidth / fiscalYears.length - barWidth) / 2;
          let yCursor = padding.top + chartHeight;
          const yearRows = budgetRecords.filter(
            (record) => record.fiscalYear === year,
          );

          return (
            <g key={year}>
              {yearRows.map((record) => {
                const segmentHeight =
                  (record.amountBillions / maxTotal) * chartHeight;
                yCursor -= segmentHeight;

                return (
                  <rect
                    key={record.fundType}
                    x={x}
                    y={yCursor}
                    width={barWidth}
                    height={segmentHeight}
                    rx={4}
                    fill={fundColors[record.fundType]}
                    opacity={year === selectedYear ? 1 : 0.68}
                  >
                    <title>
                      {`FY${year} ${record.fundType}: ${formatBillions(
                        record.amountBillions,
                      )}`}
                    </title>
                  </rect>
                );
              })}
              <text
                x={x + barWidth / 2}
                y={height - 14}
                textAnchor="middle"
                className={year === selectedYear ? "chart-year active" : "chart-year"}
              >
                FY{String(year).slice(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function FundBreakdownChart({
  breakdown,
}: {
  breakdown: FundBreakdown[];
}) {
  return (
    <section className="chart-panel" aria-label="Fund breakdown for selected year">
      <div className="chart-heading">
        <div>
          <h2>Fund breakdown</h2>
          <p>Share of selected year</p>
        </div>
      </div>

      <div className="bar-list">
        {breakdown.map((fund) => (
          <div className="bar-row" key={fund.fundType}>
            <div className="bar-row-label">
              <span>{fund.fundType}</span>
              <strong>{formatBillions(fund.amountBillions)}</strong>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${fund.shareOfYear}%`,
                  background: fundColors[fund.fundType],
                }}
              />
            </div>
            <p>{fund.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChangeChart({ breakdown }: { breakdown: FundBreakdown[] }) {
  const maxChange = Math.max(
    1,
    ...breakdown.map((fund) => Math.abs(fund.yoyAmount ?? 0)),
  );

  return (
    <section className="chart-panel" aria-label="Year over year change">
      <div className="chart-heading">
        <div>
          <h2>What moved</h2>
          <p>Change from prior fiscal year</p>
        </div>
      </div>

      <div className="change-list">
        {breakdown.map((fund) => {
          const change = fund.yoyAmount ?? 0;
          const width = `${(Math.abs(change) / maxChange) * 100}%`;

          return (
            <div className="change-row" key={fund.fundType}>
              <div className="change-copy">
                <span>{fund.fundType}</span>
                <strong>
                  {formatSignedBillions(fund.yoyAmount)}{" "}
                  <small>{formatPercent(fund.yoyPercent)}</small>
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
    </section>
  );
}
