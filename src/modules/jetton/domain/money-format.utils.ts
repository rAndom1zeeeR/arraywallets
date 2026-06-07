import { coerceNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";

const STORED_AMOUNT_LABEL_RE = /^([+-]?)((?:\d[\d ]*)?(?:\.\d+)?)\s+(.+)$/;

const TON_DECIMALS = 9;
const NANOTON_PER_TON = 10n ** BigInt(TON_DECIMALS);

const COMPACT_THOUSAND = 1_000;
const COMPACT_MILLION = 1_000_000;
const COMPACT_SUBSCRIPT_ZERO_THRESHOLD = 4;
const COMPACT_MAX_SUFFIX_FRACTION_DIGITS = 2;
const COMPACT_MAX_SIGNIFICANT_FRACTION_DIGITS = 4;

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

function trimTrailingFractionZeros(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "").replace(/\.$/u, "");
}

function formatCompactScaledValue(scaled: number, maxFractionDigits: number): string {
  const fixed = scaled.toFixed(maxFractionDigits);
  return trimTrailingFractionZeros(fixed);
}

/**
 * Compact decimal with subscript zero count: `0.0000154` → `0.0(3)154`.
 * Parentheses hold how many extra zeros follow the displayed `0.0` before significant digits.
 */
export function formatCompactSubscriptDecimal(absDecimal: string): string {
  const normalized = absDecimal.replace(/^0+(?=\d)/u, "");
  const dotIndex = normalized.indexOf(".");

  if (dotIndex === -1) {
    return normalized || "0";
  }

  const fraction = normalized.slice(dotIndex + 1);
  const firstNonZeroIndex = fraction.search(/[1-9]/u);

  if (firstNonZeroIndex === -1) {
    return "0";
  }

  const leadingZeros = firstNonZeroIndex;
  const significant = fraction.slice(firstNonZeroIndex).replace(/0+$/u, "");
  const compactSignificant = significant.slice(0, COMPACT_MAX_SIGNIFICANT_FRACTION_DIGITS);

  if (leadingZeros < COMPACT_SUBSCRIPT_ZERO_THRESHOLD) {
    const plain = `0.${fraction.slice(0, firstNonZeroIndex + compactSignificant.length)}`;
    return trimTrailingFractionZeros(plain);
  }

  const subscriptZeroCount = leadingZeros - 1;
  return `0.0(${subscriptZeroCount})${compactSignificant}`;
}

/** Matches compact subscript amounts like `0.0(5)937` or `-0.0(3)77 TON`. */
export const COMPACT_MONEY_SUBSCRIPT_RE =
  /^(-?)0\.0\((\d+)\)([\d.km]+?)(?:\s+(.+))?$/iu;

export interface CompactMoneySubscriptParts {
  sign: string;
  zeroCount: string;
  significant: string;
  symbol?: string;
}

/** Parses subscript compact money text for UI rendering. */
export function parseCompactMoneySubscript(value: string): CompactMoneySubscriptParts | null {
  const match = value.trim().match(COMPACT_MONEY_SUBSCRIPT_RE);
  if (!match) {
    return null;
  }

  const [, sign = "", zeroCount = "", significant = "", symbol] = match;
  return {
    sign,
    zeroCount,
    significant,
    symbol: symbol?.trim() || undefined,
  };
}

/** Formats a human-readable decimal string (`"20010913.5"`) into compact money text. */
export function formatCompactDecimalString(
  decimal: string,
  options?: { suffix?: string }
): string {
  const trimmed = decimal.trim();
  if (!trimmed) {
    return options?.suffix ? `0 ${options.suffix}` : "0";
  }

  const isNegative = trimmed.startsWith("-");
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;
  const sign = isNegative ? "-" : "";

  if (unsigned === "0" || unsigned === "0.0") {
    const zero = options?.suffix ? `0 ${options.suffix}` : "0";
    return isNegative ? `-${zero}` : zero;
  }

  const [wholePart = "0", fractionPart = ""] = unsigned.split(".");
  const whole = BigInt(wholePart || "0");

  if (whole >= BigInt(COMPACT_MILLION)) {
    const scaled = Number(`${wholePart}.${fractionPart.slice(0, 6)}`) / COMPACT_MILLION;
    const amount = `${sign}${formatCompactScaledValue(scaled, COMPACT_MAX_SUFFIX_FRACTION_DIGITS)}m`;
    return options?.suffix ? `${amount} ${options.suffix}` : amount;
  }

  if (whole >= BigInt(COMPACT_THOUSAND)) {
    const scaled = Number(`${wholePart}.${fractionPart.slice(0, 6)}`) / COMPACT_THOUSAND;
    const amount = `${sign}${formatCompactScaledValue(scaled, COMPACT_MAX_SUFFIX_FRACTION_DIGITS)}k`;
    return options?.suffix ? `${amount} ${options.suffix}` : amount;
  }

  if (whole >= 1n) {
    const amount = `${sign}${trimTrailingFractionZeros(
      fractionPart
        ? `${wholePart}.${fractionPart.slice(0, COMPACT_MAX_SUFFIX_FRACTION_DIGITS)}`
        : wholePart
    )}`;
    return options?.suffix ? `${amount} ${options.suffix}` : amount;
  }

  const subscriptAmount = `${sign}${formatCompactSubscriptDecimal(unsigned)}`;
  return options?.suffix ? `${subscriptAmount} ${options.suffix}` : subscriptAmount;
}

/** Compact money: `20.01m`, `100k`, `0.0(3)154`. */
export function formatCompactNumber(value: number, suffix?: string): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return suffix ? `0 ${suffix}` : "0";
  }

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= COMPACT_MILLION) {
    const amount = `${sign}${formatCompactScaledValue(abs / COMPACT_MILLION, COMPACT_MAX_SUFFIX_FRACTION_DIGITS)}m`;
    return suffix ? `${amount} ${suffix}` : amount;
  }

  if (abs >= COMPACT_THOUSAND) {
    const amount = `${sign}${formatCompactScaledValue(abs / COMPACT_THOUSAND, COMPACT_MAX_SUFFIX_FRACTION_DIGITS)}k`;
    return suffix ? `${amount} ${suffix}` : amount;
  }

  if (abs >= 1) {
    const amount = `${sign}${formatCompactScaledValue(abs, COMPACT_MAX_SUFFIX_FRACTION_DIGITS)}`;
    return suffix ? `${amount} ${suffix}` : amount;
  }

  const decimal = abs.toFixed(18).replace(/0+$/u, "");
  return formatCompactDecimalString(`${sign}${decimal}`, { suffix });
}

function formatCompactFromRawUnits(
  raw: bigint,
  decimals: number,
  suffix?: string
): string {
  const sign = raw < 0n ? "-" : "";
  const abs = raw < 0n ? -raw : raw;

  if (abs === 0n) {
    return suffix ? `0 ${suffix}` : "0";
  }

  if (decimals <= 0) {
    return formatCompactDecimalString(`${sign}${abs.toString()}`, { suffix });
  }

  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const frac = abs % divisor;

  if (frac === 0n) {
    return formatCompactDecimalString(`${sign}${whole.toString()}`, { suffix });
  }

  const fracPadded = frac.toString().padStart(decimals, "0").replace(/0+$/u, "");
  return formatCompactDecimalString(`${sign}${whole.toString()}.${fracPadded}`, { suffix });
}

/** Compact jetton balance from on-chain raw units. */
export function formatCompactMoneyJetton(
  raw: bigint | string | number | null | undefined,
  decimals: number,
  symbol = ""
): string {
  const amount = coerceNanoton(raw);
  const suffix = symbol.trim() || undefined;
  return formatCompactFromRawUnits(amount, decimals, suffix);
}

/** Compact TON balance from nanoton. */
export function formatCompactMoneyTonFromNanoton(
  nanoton: bigint | string | number | null | undefined
): string {
  const amount = coerceNanoton(nanoton);
  return formatCompactFromRawUnits(amount, TON_DECIMALS, "TON");
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
