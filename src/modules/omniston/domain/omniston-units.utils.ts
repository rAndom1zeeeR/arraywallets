/**
 * Converts a decimal amount string to Omniston base units.
 */
export function toOmnistonBaseUnits(amount: string, decimals = 9): string | null {
  const trimmed = amount.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  const factor = 10 ** decimals;
  const baseUnits = Math.floor(parsed * factor);

  if (baseUnits <= 0) {
    return null;
  }

  return String(baseUnits);
}

/**
 * Formats Omniston base units for display.
 */
export function fromOmnistonBaseUnits(baseUnits: string, decimals = 9, fractionDigits = 6): string {
  const parsed = Number(baseUnits);
  if (!Number.isFinite(parsed)) {
    return "0";
  }

  const factor = 10 ** decimals;
  return (parsed / factor).toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
  });
}
