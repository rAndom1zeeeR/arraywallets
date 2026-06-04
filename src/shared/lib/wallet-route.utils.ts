export const WALLET_TAB_IDS = ["events", "swaps", "pnl"] as const;

export type WalletTabId = (typeof WALLET_TAB_IDS)[number];

export interface WalletPageQueryOptions {
  tab?: WalletTabId;
  page?: number;
  swaps?: boolean;
}

export function parseWalletTabParam(value: string | string[] | undefined): WalletTabId {
  const raw = typeof value === "string" ? value : undefined;
  if (raw && WALLET_TAB_IDS.includes(raw as WalletTabId)) {
    return raw as WalletTabId;
  }

  return "events";
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

  if (options.tab !== undefined && options.tab !== "events") {
    params.set("tab", options.tab);
  }

  if (options.page !== undefined && options.page > 1) {
    params.set("page", String(options.page));
  }

  if (options.swaps) {
    params.set("swaps", "1");
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
