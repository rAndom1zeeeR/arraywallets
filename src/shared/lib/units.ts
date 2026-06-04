const POW10 = [
  1n,
  10n,
  100n,
  1_000n,
  10_000n,
  100_000n,
  1_000_000n,
  10_000_000n,
  100_000_000n,
  1_000_000_000n,
] as const;

const pow10 = (decimals: number): bigint => {
  if (decimals < 0 || decimals > 77) throw new Error("Invalid decimals");
  if (decimals <= 9) return POW10[decimals]!;
  let p = 1n;
  while (decimals--) p *= 10n;
  return p;
};

interface ParsedValue {
  whole: bigint;
  frac: bigint;
  neg: boolean;
  base: bigint;
}

const parseInput = (value: number | string | bigint, decimals: number): ParsedValue => {
  const base = pow10(decimals);

  if (typeof value === "bigint") {
    return { whole: value, frac: 0n, neg: value < 0n, base };
  }

  const src = typeof value === "number" ? String(value) : value;
  let neg = false;
  let clean = src;

  while (clean.startsWith("-")) {
    neg = !neg;
    clean = clean.slice(1);
  }

  if (clean === ".") throw new Error("Invalid number");

  const [wholeStr = "0", fracStr = "0"] = clean.split(".");
  if (fracStr.length > decimals) throw new Error("Invalid number");

  const whole = BigInt(wholeStr || "0");
  const frac = BigInt(fracStr.padEnd(decimals, "0").slice(0, decimals) || "0");

  return { whole, frac, neg, base };
};

const formatOutput = (whole: bigint, frac: bigint, neg: boolean, decimals: number): string => {
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "") || "0";
  const value = fracStr === "0" ? whole.toString() : `${whole}.${fracStr}`;
  return neg ? `-${value}` : value;
};

/**
 * Convert smallest units to human-readable string
 * @example fromUnits(1500000000n, 9) // "1.5"
 * @example fromUnits(1000000n, 6) // "1"
 */
export const fromUnits = (amount: bigint | number | string, decimals: number): string => {
  let v = BigInt(amount);
  const neg = v < 0n;
  if (neg) v = -v;

  const base = pow10(decimals);
  const whole = v / base;
  const frac = v % base;

  return formatOutput(whole, frac, neg, decimals);
};

/**
 * Convert human-readable amount to smallest units (bigint)
 * @example toUnits("1.5", 9) // 1500000000n
 * @example toUnits(1n, 9) // 1000000000n (bigint treated as whole units)
 * @example toUnits("100", 6) // 100000000n
 */
export const toUnits = (value: number | string | bigint, decimals: number): bigint => {
  const { whole, frac, neg, base } = parseInput(value, decimals);
  const result = whole * base + frac;
  return neg ? -result : result;
};
