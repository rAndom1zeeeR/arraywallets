import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";

export const walletQueryKeys = {
  root: (address: string) => ["wallet", address] as const,
  summary: (address: string) => [...walletQueryKeys.root(address), "summary"] as const,
  events: (address: string, page: number, filters: WalletHistoryFilters) =>
    [
      ...walletQueryKeys.root(address),
      "events",
      page,
      filters.actionType,
      filters.actionStatus,
      filters.direction,
      filters.dateFrom,
      filters.dateTo,
    ] as const,
};
