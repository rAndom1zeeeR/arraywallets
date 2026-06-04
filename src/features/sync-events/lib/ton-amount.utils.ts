const TON_DECIMALS = 9;
const NANOTON_PER_TON = 10n ** BigInt(TON_DECIMALS);

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
export function formatTonFromNanoton(nanoton: bigint): string {
  const sign = nanoton < 0n ? "-" : "";
  const abs = nanoton < 0n ? -nanoton : nanoton;
  const whole = abs / NANOTON_PER_TON;
  const frac = abs % NANOTON_PER_TON;

  if (frac === 0n) {
    return `${sign}${whole.toString()} TON`;
  }

  const fracStr = frac.toString().padStart(TON_DECIMALS, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}.${fracStr} TON`;
}

/**
 * Formats jetton raw amount (smallest units) with decimals and symbol.
 */
export function formatJettonFromRaw(raw: bigint, decimals: number, symbol: string): string {
  if (decimals <= 0) {
    return `${raw.toString()} ${symbol}`;
  }

  const divisor = 10n ** BigInt(decimals);
  const sign = raw < 0n ? "-" : "";
  const abs = raw < 0n ? -raw : raw;
  const whole = abs / divisor;
  const frac = abs % divisor;

  if (frac === 0n) {
    return `${sign}${whole.toString()} ${symbol}`;
  }

  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}.${fracStr} ${symbol}`;
}
