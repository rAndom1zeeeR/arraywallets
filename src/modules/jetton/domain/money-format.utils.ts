const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return usdCompactFormatter.format(value);
  }

  if (abs > 0 && abs < 0.01) {
    return usdCompactFormatter.format(value);
  }

  return usdFormatter.format(value);
}

/** Per-token USD price (may be very small). */
export function formatUsdUnitPrice(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return usdCompactFormatter.format(value);
}

export function formatPercentRatio(ratio: number | null | undefined): string | null {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return null;
  }

  return percentFormatter.format(ratio);
}

export function formatTonPrice(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  if (value >= 1) {
    return `${value.toFixed(4)} TON`;
  }

  return `${value.toFixed(8)} TON`;
}

/** Human TON amount (cost / invested), not per-token price. */
export function formatTonAmount(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const abs = Math.abs(value);
  if (abs >= 1) {
    return `${value.toFixed(4)} TON`;
  }

  if (abs === 0) {
    return "0 TON";
  }

  return `${value.toFixed(6)} TON`;
}

/** Side-by-side TON and USD totals for PnL rows. */
export function formatTonUsdPair(ton: number | null, usd: number | null): string | null {
  const tonText = formatTonAmount(ton);
  const usdText = formatUsd(usd);

  if (tonText && usdText) {
    return `${tonText} · ${usdText}`;
  }

  return tonText ?? usdText;
}
