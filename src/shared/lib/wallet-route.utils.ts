export interface WalletPageQueryOptions {
  page?: number;
  swaps?: boolean;
}

/**
 * URL-safe wallet segment for `/wallets/[address]`.
 */
export function encodeWalletAddressParam(address: string): string {
  return encodeURIComponent(address);
}

/**
 * Decodes `[address]` route param from Next.js.
 */
export function decodeWalletAddressParam(param: string): string {
  return decodeURIComponent(param);
}

/**
 * Path to wallet transactions page with optional pagination and swap filter.
 */
export function getWalletPagePath(address: string, options: WalletPageQueryOptions = {}): string {
  const base = `/wallets/${encodeWalletAddressParam(address)}`;
  const params = new URLSearchParams();

  if (options.page !== undefined && options.page > 1) {
    params.set("page", String(options.page));
  }

  if (options.swaps) {
    params.set("swaps", "1");
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
