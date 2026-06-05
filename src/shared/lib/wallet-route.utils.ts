import {
  EMPTY_WALLET_HISTORY_FILTERS,
  isChainActionTypeValue,
  parseWalletHistoryDirectionFilter,
  parseWalletHistoryStatusFilter,
  WALLET_HISTORY_FILTER_ALL,
  type WalletHistoryFilters,
  type WalletHistoryStatusFilter,
  type WalletEventDirectionFilter,
  type WalletEventTypeFilter,
} from "@/modules/wallet/domain/wallet-events-filter.utils";
import { parseWalletHistoryDateRange } from "@/modules/wallet/domain/wallet-history-date.utils";

export const WALLET_TAB_IDS = ["events", "swaps", "pnl", "tokens"] as const;

export type WalletTabId = (typeof WALLET_TAB_IDS)[number];

export interface WalletPageQueryOptions {
  tab?: WalletTabId;
  page?: number;
  type?: WalletEventTypeFilter;
  status?: WalletHistoryStatusFilter;
  direction?: WalletEventDirectionFilter;
  from?: string;
  to?: string;
  sync?: boolean;
}

export function parseWalletTabParam(value: string | string[] | undefined): WalletTabId {
  const raw = typeof value === "string" ? value : undefined;
  if (raw && WALLET_TAB_IDS.includes(raw as WalletTabId)) {
    return raw as WalletTabId;
  }

  return "events";
}

export function parseWalletEventTypeParam(
  typeParam: string | string[] | undefined,
  legacySwapsParam?: string | string[] | undefined
): WalletEventTypeFilter {
  const rawType = typeof typeParam === "string" ? typeParam : undefined;
  if (rawType === WALLET_HISTORY_FILTER_ALL) {
    return WALLET_HISTORY_FILTER_ALL;
  }

  if (rawType && isChainActionTypeValue(rawType)) {
    return rawType;
  }

  const legacySwaps = typeof legacySwapsParam === "string" ? legacySwapsParam : undefined;
  if (legacySwaps === "1") {
    return "JETTON_SWAP";
  }

  return WALLET_HISTORY_FILTER_ALL;
}

/** @deprecated Use {@link parseWalletHistoryFilters} */
export function parseWalletEventStatusParam(
  value: string | string[] | undefined
): WalletHistoryStatusFilter {
  return parseWalletHistoryStatusFilter(typeof value === "string" ? value : undefined);
}

export interface WalletHistorySearchParamsReader {
  get(name: string): string | null;
}

export function parseWalletHistoryFiltersFromSearchParams(
  searchParams: WalletHistorySearchParamsReader
): WalletHistoryFilters {
  return parseWalletHistoryFilters({
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    direction: searchParams.get("direction") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    swaps: searchParams.get("swaps") ?? undefined,
  });
}

export function parseWalletHistoryFilters(query: {
  type?: string | string[] | undefined;
  status?: string | string[] | undefined;
  direction?: string | string[] | undefined;
  from?: string | string[] | undefined;
  to?: string | string[] | undefined;
  swaps?: string | string[] | undefined;
}): WalletHistoryFilters {
  const dateRange = parseWalletHistoryDateRange(
    typeof query.from === "string" ? query.from : undefined,
    typeof query.to === "string" ? query.to : undefined
  );

  return {
    actionType: parseWalletEventTypeParam(query.type, query.swaps),
    actionStatus: parseWalletHistoryStatusFilter(
      typeof query.status === "string" ? query.status : undefined
    ),
    direction: parseWalletHistoryDirectionFilter(
      typeof query.direction === "string" ? query.direction : undefined
    ),
    ...dateRange,
  };
}

export function encodeWalletAddressParam(address: string): string {
  return encodeURIComponent(address);
}

export function decodeWalletAddressParam(param: string): string {
  return decodeURIComponent(param);
}

export function getWalletPagePath(address: string, options: WalletPageQueryOptions = {}): string {
  const base = `/wallets/${encodeWalletAddressParam(address)}`;
  const params = new URLSearchParams();

  if (options.tab !== undefined && options.tab !== "events") {
    params.set("tab", options.tab);
  }

  if (options.page !== undefined && options.page > 1) {
    params.set("page", String(options.page));
  }

  if (options.type !== undefined && options.type !== WALLET_HISTORY_FILTER_ALL) {
    params.set("type", options.type);
  }

  if (options.status !== undefined && options.status !== WALLET_HISTORY_FILTER_ALL) {
    params.set("status", options.status);
  }

  if (options.direction !== undefined && options.direction !== WALLET_HISTORY_FILTER_ALL) {
    params.set("direction", options.direction);
  }

  if (options.from) {
    params.set("from", options.from);
  }

  if (options.to) {
    params.set("to", options.to);
  }

  if (options.sync) {
    params.set("sync", "1");
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function walletHistoryFiltersToQueryOptions(
  filters: WalletHistoryFilters
): Pick<WalletPageQueryOptions, "type" | "status" | "direction" | "from" | "to"> {
  const options: Pick<WalletPageQueryOptions, "type" | "status" | "direction" | "from" | "to"> =
    {};

  if (filters.actionType !== WALLET_HISTORY_FILTER_ALL) {
    options.type = filters.actionType;
  }

  if (filters.actionStatus !== WALLET_HISTORY_FILTER_ALL) {
    options.status = filters.actionStatus;
  }

  if (filters.direction !== WALLET_HISTORY_FILTER_ALL) {
    options.direction = filters.direction;
  }

  if (filters.dateFrom) {
    options.from = filters.dateFrom;
  }

  if (filters.dateTo) {
    options.to = filters.dateTo;
  }

  return options;
}

/** Writes active history filters into an existing {@link URLSearchParams} instance. */
export function applyWalletHistoryFiltersToSearchParams(
  params: URLSearchParams,
  filters: WalletHistoryFilters
): void {
  const options = walletHistoryFiltersToQueryOptions(filters);

  if (options.type) {
    params.set("type", options.type);
  }

  if (options.status) {
    params.set("status", options.status);
  }

  if (options.direction) {
    params.set("direction", options.direction);
  }

  if (options.from) {
    params.set("from", options.from);
  }

  if (options.to) {
    params.set("to", options.to);
  }
}

export { EMPTY_WALLET_HISTORY_FILTERS };
