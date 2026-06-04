import { coerceNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";

const STORED_AMOUNT_LABEL_RE = /^([+-]?)((?:\d[\d ]*)?(?:\.\d+)?)\s+(.+)$/;

const TON_DECIMALS = 9;
const NANOTON_PER_TON = 10n ** BigInt(TON_DECIMALS);

/** Table / card display presets. */
export type MoneyFormatPreset =
  | "usd"
  | "usdUnitPrice"
  | "tonAmount"
  | "tonUnitPrice"
  | "percentRatio"
  | "percentChange";

const plainNumberFormatterCache = new Map<string, Intl.NumberFormat>();

function getPlainNumberFormatter(maxFractionDigits: number, minFractionDigits = 0): Intl.NumberFormat {
  const key = `${minFractionDigits}-${maxFractionDigits}`;
  let formatter = plainNumberFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      useGrouping: false,
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    });
    plainNumberFormatterCache.set(key, formatter);
  }
  return formatter;
}

function formatPlainNumber(
  value: number,
  maxFractionDigits: number,
  minFractionDigits = 0
): string {
  return getPlainNumberFormatter(maxFractionDigits, minFractionDigits).format(value);
}

/** Groups integer digits with spaces: `32545625` → `32 545 625`. */
export function formatIntegerWithSpaces(value: string | bigint): string {
  const raw = value.toString();
  const isNegative = raw.startsWith("-");
  const digits = isNegative ? raw.slice(1) : raw;

  if (!/^\d+$/.test(digits)) {
    return raw;
  }

  const groups: string[] = [];
  for (let index = digits.length; index > 0; index -= 3) {
    groups.unshift(digits.slice(Math.max(0, index - 3), index));
  }

  return `${isNegative ? "-" : ""}${groups.join(" ")}`;
}

function applyTableThousandsGrouping(amount: string): string {
  const dotIndex = amount.indexOf(".");

  if (dotIndex === -1) {
    return formatIntegerWithSpaces(amount);
  }

  const whole = amount.slice(0, dotIndex);
  const fraction = amount.slice(dotIndex + 1);
  return `${formatIntegerWithSpaces(whole)}.${fraction}`;
}

/**
 * 2 fractional digits when |value| >= 1 (number does not start with `0.`);
 * sub-unit values keep extra precision (e.g. `$0.00006724`).
 */
export function resolveTableFractionDigits(
  abs: number,
  maxSubUnitFractionDigits = 12
): { min: number; max: number } {
  if (abs === 0) {
    return { min: 0, max: 0 };
  }

  if (abs >= 1) {
    return { min: 2, max: 2 };
  }

  return { min: 0, max: maxSubUnitFractionDigits };
}

/** @internal Exported for tests */
export function formatConditionalTableNumber(abs: number): string {
  if (abs === 0) {
    return "0";
  }

  const { min, max } = resolveTableFractionDigits(abs);
  return applyTableThousandsGrouping(formatPlainNumber(abs, max, min));
}

function formatSignedConditionalTableNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatConditionalTableNumber(Math.abs(value))}`;
}

/**
 * Formats whole + fractional smallest units for tables (Sold / Bought / TON columns).
 */
export function formatConditionalTableParts(
  sign: string,
  whole: bigint,
  frac: bigint,
  decimals: number,
  suffix?: string
): string {
  const suffixPart = suffix ? ` ${suffix}` : "";

  if (frac === 0n) {
    return `${sign}${formatIntegerWithSpaces(whole)}${suffixPart}`;
  }

  const fracPadded = frac.toString().padStart(decimals, "0");

  if (whole >= 1n) {
    const scale = 10n ** BigInt(decimals);
    const absSmallest = whole * scale + frac;
    const divisor = decimals > 2 ? 10n ** BigInt(decimals - 2) : 1n;
    const half = divisor / 2n;
    const rounded = (absSmallest + half) / divisor * divisor;
    const newWhole = rounded / scale;
    const rem = rounded % scale;
    const fracTwoDigits =
      decimals >= 2
        ? (rem / (10n ** BigInt(decimals - 2))).toString().padStart(2, "0")
        : rem.toString();

    const amount = applyTableThousandsGrouping(`${newWhole.toString()}.${fracTwoDigits}`);
    return `${sign}${amount}${suffixPart}`;
  }

  const trimmed = fracPadded.replace(/0+$/, "");
  const amount = applyTableThousandsGrouping(`${whole.toString()}.${trimmed}`);
  return `${sign}${amount}${suffixPart}`;
}

/**
 * Unified money formatter for tables and summary cards.
 */
export function formatMoney(
  value: number | null | undefined,
  preset: MoneyFormatPreset
): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  switch (preset) {
    case "usd":
      return `$${formatSignedConditionalTableNumber(value)}`;
    case "usdUnitPrice":
      return `$${formatSignedConditionalTableNumber(value)}`;
    case "tonAmount": {
      if (value === 0) {
        return "0 TON";
      }
      return `${formatSignedConditionalTableNumber(value)} TON`;
    }
    case "tonUnitPrice": {
      return `${formatSignedConditionalTableNumber(value)} TON`;
    }
    case "percentRatio": {
      return getPercentRatioFormatter().format(value);
    }
    case "percentChange": {
      const sign = value > 0 ? "+" : "";
      return `${sign}${formatPlainNumber(value, 2, 0)}%`;
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

const percentRatioFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  useGrouping: false,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getPercentRatioFormatter(): Intl.NumberFormat {
  return percentRatioFormatter;
}

/** Human-readable 24h change for price columns (e.g. `+75.98% 24h`). */
export function formatPercentChange24h(percent: number | null | undefined): string | null {
  const text = formatMoney(percent, "percentChange");
  return text ? `${text} 24h` : null;
}

/** Jetton amount from on-chain raw units (Sold / Bought columns). */
export function formatMoneyJetton(
  raw: bigint | string | number | null | undefined,
  decimals: number,
  symbol: string
): string {
  const amount = coerceNanoton(raw);

  if (decimals <= 0) {
    return `${formatIntegerWithSpaces(amount)} ${symbol}`;
  }

  const divisor = 10n ** BigInt(decimals);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / divisor;
  const frac = abs % divisor;

  return formatConditionalTableParts(sign, whole, frac, decimals, symbol);
}

/** TON from nanoton for swap tables (TON got / TON paid). */
export function formatMoneyTonFromNanoton(
  nanoton: bigint | string | number | null | undefined
): string {
  const amount = coerceNanoton(nanoton);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / NANOTON_PER_TON;
  const frac = abs % NANOTON_PER_TON;

  return formatConditionalTableParts(sign, whole, frac, TON_DECIMALS, "TON");
}

export function formatUsd(value: number | null | undefined): string | null {
  return formatMoney(value, "usd");
}

export function formatUsdUnitPrice(value: number | null | undefined): string | null {
  return formatMoney(value, "usdUnitPrice");
}

export function formatPercentRatio(ratio: number | null | undefined): string | null {
  return formatMoney(ratio, "percentRatio");
}

export function formatTonPrice(value: number | null | undefined): string | null {
  return formatMoney(value, "tonUnitPrice");
}

export function formatTonAmount(value: number | null | undefined): string | null {
  return formatMoney(value, "tonAmount");
}

export function formatTonUsdPair(ton: number | null, usd: number | null): string | null {
  const tonText = formatTonAmount(ton);
  const usdText = formatUsd(usd);

  if (tonText && usdText) {
    return `${tonText} · ${usdText}`;
  }

  return tonText ?? usdText;
}

function formatStoredAmountSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) {
    return trimmed;
  }

  const match = trimmed.match(STORED_AMOUNT_LABEL_RE);
  if (!match) {
    return trimmed;
  }

  const [, sign = "", numericPart, symbolPart] = match;
  const normalizedNumeric = numericPart.replace(/\s/g, "");
  const numeric = Number.parseFloat(normalizedNumeric);
  if (!Number.isFinite(numeric)) {
    return trimmed;
  }

  return `${sign}${formatConditionalTableNumber(Math.abs(numeric))} ${symbolPart}`;
}

/** Reformats legacy DB displayAmount strings (incl. `A → B` swap labels). */
export function formatStoredAmountLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) {
    return null;
  }

  if (label.includes("→")) {
    return label
      .split("→")
      .map(part => formatStoredAmountSegment(part))
      .join(" → ");
  }

  return formatStoredAmountSegment(label);
}

export interface EventActionAmountInput {
  type: string;
  displayAmount: string | null;
  amount: string | { toString(): string } | null;
  jetton: { symbol: string; decimals: number } | null;
}

/** Events table Amount column — raw jetton when possible, else relabel stored text. */
export function formatEventActionAmount(action: EventActionAmountInput): string | null {
  const amountRaw =
    action.amount === null || action.amount === undefined
      ? null
      : typeof action.amount === "string"
        ? action.amount
        : action.amount.toString();

  if (
    amountRaw &&
    action.jetton &&
    action.type !== "JETTON_SWAP" &&
    action.type !== "INFERRED_SWAP"
  ) {
    return formatMoneyJetton(parseNanoton(amountRaw), action.jetton.decimals, action.jetton.symbol);
  }

  return formatStoredAmountLabel(action.displayAmount);
}

/** Events table TON in/out sub-line; returns null when zero or missing. */
export function formatTonLegIfNonZero(
  nanoton: string | bigint | number | { toString(): string } | null | undefined
): string | null {
  if (nanoton === null || nanoton === undefined) {
    return null;
  }

  const raw = typeof nanoton === "bigint" ? nanoton.toString() : nanoton.toString();
  if (parseNanoton(raw) === 0n) {
    return null;
  }

  return formatMoneyTonFromNanoton(raw);
}
