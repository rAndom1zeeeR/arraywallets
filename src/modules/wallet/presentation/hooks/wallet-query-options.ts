import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { walletQueryKeys } from "@/modules/wallet/api/wallet-query-keys";
import { fetchWalletSummary, fetchWalletEvents } from "@/modules/wallet/api/wallet-api.client";

const SUMMARY_STALE_MS = 30_000;
const EVENTS_STALE_MS = 60_000;

export function walletSummaryQueryOptions(address: string) {
  return queryOptions({
    queryKey: walletQueryKeys.summary(address),
    queryFn: () => fetchWalletSummary(address),
    staleTime: SUMMARY_STALE_MS,
  });
}

export function walletEventsQueryOptions(address: string, page: number, swapsOnly: boolean) {
  return queryOptions({
    queryKey: walletQueryKeys.events(address, page, swapsOnly),
    queryFn: () => fetchWalletEvents(address, page, swapsOnly),
    staleTime: EVENTS_STALE_MS,
    placeholderData: keepPreviousData,
  });
}
