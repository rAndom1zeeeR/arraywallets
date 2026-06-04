/** Prisma Decimal / pg numeric → bigint for TON `lt` cursors. */
export const decimalLtToBigint = (value: unknown): bigint | null => {
  if (value == null) {
    return null;
  }
  const asString =
    typeof value === "string"
      ? value
      : typeof value === "bigint"
        ? value.toString()
        : typeof value === "number"
          ? String(Math.trunc(value))
          : typeof value === "object" && value !== null && "toString" in value
            ? (value as { toString: () => string }).toString()
            : String(value);
  const normalized = asString.split(".")[0] ?? asString;
  return BigInt(normalized);
};

export const bigintToDecimal = (value: bigint): string => value.toString();
