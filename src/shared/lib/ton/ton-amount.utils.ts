const TON_DECIMALS = 9;
const NANOTON_PER_TON = 10n ** BigInt(TON_DECIMALS);

/** Normalizes API/Prisma nanoton values to bigint. */
export function coerceNanoton(value: bigint | string | number | null | undefined): bigint {
  if (value === null || value === undefined) {
    return 0n;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(Math.trunc(value));
  }

  return parseNanoton(value);
}

/**
 * Parses a Prisma Decimal string (nanotons) into bigint.
 */
export function parseNanoton(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  const normalized = value.trim();
  if (!normalized) {
    return 0n;
  }

  const [wholePart] = normalized.split(".");
  return BigInt(wholePart || "0");
}

/**
 * Formats nanoton bigint as human-readable TON (up to 9 fractional digits, trimmed).
 */
export function formatTonFromNanoton(nanoton: bigint | string | number | null | undefined): string {
  const amount = coerceNanoton(nanoton);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / NANOTON_PER_TON;
  const frac = abs % NANOTON_PER_TON;

  if (frac === 0n) {
    return `${sign}${whole.toString()} TON`;
  }

  const fracStr = frac.toString().padStart(TON_DECIMALS, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}.${fracStr} TON`;
}

/**
 * Converts nanoton bigint to TON number without precision loss on the integer part.
 */
export function nanotonToTonNumber(
  nanoton: bigint | string | number | null | undefined,
): number {
  const amount = coerceNanoton(nanoton);
  if (amount === 0n) {
    return 0;
  }

  const sign = amount < 0n ? -1 : 1;
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / NANOTON_PER_TON;
  const frac = abs % NANOTON_PER_TON;

  if (frac === 0n) {
    return sign * Number(whole);
  }

  return sign * (Number(whole) + Number(frac) / Number(NANOTON_PER_TON));
}

/**
 * Converts jetton raw amount to human-readable number using jetton decimals.
 */
export function jettonRawToNumber(
  raw: bigint | string | number | null | undefined,
  decimals: number,
): number {
  const amount = coerceNanoton(raw);
  if (amount === 0n) {
    return 0;
  }

  const safeDecimals = Number.isFinite(decimals)
    ? Math.max(0, Math.min(36, Math.floor(decimals)))
    : 0;

  if (safeDecimals === 0) {
    return Number(amount);
  }

  const divisor = 10n ** BigInt(safeDecimals);
  const sign = amount < 0n ? -1 : 1;
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / divisor;
  const frac = abs % divisor;

  if (frac === 0n) {
    return sign * Number(whole);
  }

  return sign * (Number(whole) + Number(frac) / Number(divisor));
}

/**
 * Formats jetton raw amount (smallest units) with decimals and symbol.
 */
export function formatJettonFromRaw(
  raw: bigint | string | number | null | undefined,
  decimals: number,
  symbol: string
): string {
  const amount = coerceNanoton(raw);

  if (decimals <= 0) {
    return `${amount.toString()} ${symbol}`;
  }

  const divisor = 10n ** BigInt(decimals);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  const whole = abs / divisor;
  const frac = abs % divisor;

  if (frac === 0n) {
    return `${sign}${whole.toString()} ${symbol}`;
  }

  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}.${fracStr} ${symbol}`;
}
