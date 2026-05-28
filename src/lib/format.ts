export function formatCurrency(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }

  return `$${value.toFixed(0)}`;
}

export function formatSignedCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatShare(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
