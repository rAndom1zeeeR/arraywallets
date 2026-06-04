import { Address } from "@ton/core";

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
