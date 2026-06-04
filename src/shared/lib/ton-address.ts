import { Address } from "@ton/core";

const RAW_TON_ADDRESS_PATTERN = /^-?\d+:[0-9a-fA-F]+$/;

/**
 * Canonical raw TON address (`workchain:hex`), e.g. `0:abc...`.
 * Use before every DB write for `wallet_address`, `raw_address`, and on-chain `address` fields.
 */
export function toRawTonAddress(input: string | Address): string {
  const address =
    typeof input === "string" ? Address.parse(input.trim()) : input;
  return address.toRawString();
}

/** Returns true if the string is already in raw `workchain:hex` form. */
export function isRawTonAddress(value: string): boolean {
  if (!RAW_TON_ADDRESS_PATTERN.test(value)) {
    return false;
  }
  try {
    return toRawTonAddress(value) === value;
  } catch {
    return false;
  }
}

/**
 * Parses and returns raw form, or null when input is not a valid TON address.
 */
export function tryToRawTonAddress(input: string): string | null {
  try {
    return toRawTonAddress(input);
  } catch {
    return null;
  }
}

/**
 * Normalizes TON address to canonical string (bounceable user-friendly).
 */
export function normalizeWalletAddress(address: string): string {
  return Address.parse(address).toString();
}

/**
 * All string forms used historically in DB (friendly + raw).
 */
export function getWalletAddressVariants(address: string): string[] {
  const parsed = Address.parse(address);
  const friendly = parsed.toString();
  const raw = parsed.toRawString();
  return friendly === raw ? [friendly] : [friendly, raw];
}

/**
 * Whether two address strings refer to the same on-chain wallet.
 */
export function isSameWalletAddress(stored: string, target: string): boolean {
  try {
    return toRawTonAddress(stored) === toRawTonAddress(target);
  } catch {
    return stored.trim() === target.trim();
  }
}

/**
 * Every `wallet_address` value in DB that belongs to the given wallet (any format).
 */
export function collectMatchingWalletAddressKeys(
  storedAddresses: string[],
  targetAddress: string
): string[] {
  const keys = new Set(getWalletAddressVariants(targetAddress));

  for (const stored of storedAddresses) {
    if (isSameWalletAddress(stored, targetAddress)) {
      keys.add(stored);
    }
  }

  return [...keys];
}
