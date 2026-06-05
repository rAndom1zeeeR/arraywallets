import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { walletQueryKeys } from "@/modules/wallet/api/wallet-query-keys";
import {
  fetchWalletBalances,
  fetchWalletSummary,
  fetchWalletEvents,
} from "@/modules/wallet/api/wallet-api.client";
import type { WalletAccountBalances } from "@/modules/wallet/domain/wallet-balances.types";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";

const SUMMARY_STALE_MS = 30_000;
const BALANCES_STALE_MS = 30_000;
const EVENTS_STALE_MS = 60_000;

export function walletSummaryQueryOptions(address: string) {
  return queryOptions({
    queryKey: walletQueryKeys.summary(address),
    queryFn: () => fetchWalletSummary(address),
    staleTime: SUMMARY_STALE_MS,
  });
}

export function walletBalancesQueryOptions(address: string) {
  return queryOptions<WalletAccountBalances>({
    queryKey: walletQueryKeys.balances(address),
    queryFn: () => fetchWalletBalances(address),
    staleTime: BALANCES_STALE_MS,
  });
}

export function walletEventsQueryOptions(
  address: string,
  page: number,
  filters: WalletHistoryFilters
) {
  return queryOptions({
    queryKey: walletQueryKeys.events(address, page, filters),
    queryFn: () => fetchWalletEvents(address, page, filters),
    staleTime: EVENTS_STALE_MS,
    placeholderData: keepPreviousData,
  });
}
