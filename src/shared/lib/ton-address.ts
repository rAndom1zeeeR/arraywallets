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
