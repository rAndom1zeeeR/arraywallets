import { ChainActionDirection } from "@/shared/api/prisma-client";

const TRANSFERRING_PREFIX = /^transferring\s+/i;
const AMOUNT_ONLY_PATTERN = /^[\d][\d.,]*\s+[\w₮]+$/u;

interface ParsedAmountLabel {
  value: number;
  symbol: string;
  rawValue: string;
}

export function stripTransferringPrefix(text: string): string {
  return text.replace(TRANSFERRING_PREFIX, "").trim();
}

function normalizeAmountLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function stripLeadingSign(value: string): string {
  return value.replace(/^[+\-−]\s*/, "").trim();
}

function normalizeCurrencySymbol(symbol: string): string {
  return symbol
    .trim()
    .toUpperCase()
    .replace(/₮/g, "T")
    .replace(/[^A-Z0-9]/g, "");
}

function currencySymbolsMatch(a: string, b: string): boolean {
  const left = normalizeCurrencySymbol(a);
  const right = normalizeCurrencySymbol(b);

  if (left === right) {
    return true;
  }

  if (left.startsWith("USD") && right.startsWith("USD")) {
    return true;
  }

  return false;
}

function isAmountOnlyLabel(text: string): boolean {
  const cleaned = stripLeadingSign(stripTransferringPrefix(text)).trim();
  return AMOUNT_ONLY_PATTERN.test(cleaned);
}

function decimalPlacesInRaw(raw: string): number {
  const dotIndex = raw.indexOf(".");
  if (dotIndex === -1) {
    return 0;
  }
  return raw.length - dotIndex - 1;
}

function parseAmountLabel(text: string): ParsedAmountLabel | null {
  const cleaned = stripLeadingSign(stripTransferringPrefix(text.trim()));
  if (!isAmountOnlyLabel(cleaned)) {
    return null;
  }

  const match = cleaned.match(/^([\d.,]+)\s+(.+)$/u);
  if (!match) {
    return null;
  }

  const rawValue = match[1];
  const value = Number.parseFloat(rawValue.replace(/,/g, ""));
  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    value,
    symbol: match[2].trim(),
    rawValue,
  };
}

/**
 * TonAPI simplePreview often rounds: "188 USD₮" for Amount "188.42171 USDT".
 */
function isRoundedAmountDuplicate(
  preview: ParsedAmountLabel,
  display: ParsedAmountLabel
): boolean {
  if (!currencySymbolsMatch(preview.symbol, display.symbol)) {
    return false;
  }

  if (Math.abs(preview.value - display.value) < 1e-9) {
    return true;
  }

  const decimals = decimalPlacesInRaw(preview.rawValue);
  const factor = 10 ** decimals;
  const roundedDisplay = Math.round(display.value * factor) / factor;
  const truncatedDisplay = Math.trunc(display.value * factor) / factor;

  if (Math.abs(roundedDisplay - preview.value) < 1e-9) {
    return true;
  }

  if (Math.abs(truncatedDisplay - preview.value) < 1e-9) {
    return true;
  }

  if (Number.isInteger(preview.value) && Math.abs(Math.trunc(display.value) - preview.value) < 1e-9) {
    return true;
  }

  return false;
}

/**
 * True when preview repeats Amount (exact, signed, or rounded/truncated).
 */
export function isAmountLabelEquivalent(
  preview: string,
  displayAmount: string,
  direction?: ChainActionDirection | null
): boolean {
  const previewNorm = normalizeAmountLabel(preview);
  const amountNorm = normalizeAmountLabel(displayAmount);

  if (previewNorm === amountNorm) {
    return true;
  }

  const previewCore = normalizeAmountLabel(stripLeadingSign(preview));
  const amountCore = normalizeAmountLabel(stripLeadingSign(displayAmount));

  if (previewCore === amountCore) {
    return true;
  }

  const signedAmounts = [
    amountNorm,
    `+${amountCore}`,
    `-${amountCore}`,
    `+${amountNorm}`,
    `-${amountNorm}`,
  ];

  if (signedAmounts.includes(previewNorm)) {
    return true;
  }

  if (direction === ChainActionDirection.INCOMING && previewNorm === `+${amountCore}`) {
    return true;
  }

  if (direction === ChainActionDirection.OUTGOING && previewNorm === `-${amountCore}`) {
    return true;
  }

  const parsedPreview = parseAmountLabel(preview);
  const parsedDisplay = parseAmountLabel(displayAmount);

  if (parsedPreview && parsedDisplay) {
    return isRoundedAmountDuplicate(parsedPreview, parsedDisplay);
  }

  return false;
}

export function normalizeSimplePreviewText(preview: string): string {
  return stripTransferringPrefix(preview.trim());
}

/**
 * Details for UI / DB: no "Transferring", empty when preview repeats Amount.
 */
export function resolveDisplayDetails(
  rawPreview: string | null | undefined,
  displayAmount: string | null | undefined,
  direction?: ChainActionDirection | null
): string | undefined {
  if (!rawPreview?.trim()) {
    return undefined;
  }

  const normalized = normalizeSimplePreviewText(rawPreview);
  if (!normalized) {
    return undefined;
  }

  if (displayAmount && isAmountLabelEquivalent(normalized, displayAmount, direction)) {
    return undefined;
  }

  return normalized;
}
