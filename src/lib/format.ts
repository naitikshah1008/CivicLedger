export function formatBillions(value: number): string {
  return `$${value.toFixed(1)}B`;
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatSignedBillions(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(1)}B`;
}

export function formatShare(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value.toFixed(0)}%`;
}
