type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "warning";
};

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
