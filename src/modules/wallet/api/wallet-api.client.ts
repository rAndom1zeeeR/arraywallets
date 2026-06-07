import { apiClient } from "@/shared/infrastructure/api/client";
import type { WalletSummaryData, WalletEventsPageData } from "@/modules/wallet/api/wallet-api.handlers";
import {
  reviveWalletAccountBalances,
  type SerializedWalletAccountBalances,
} from "@/modules/wallet/api/wallet-balances.adapter";
import { reviveWalletSwapStats, type SerializedWalletSwapStats } from "@/modules/wallet/api/wallet-api.adapter";
import type { WalletAccountBalances } from "@/modules/wallet/domain/wallet-balances.types";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import {
  applyWalletHistoryFiltersToSearchParams,
  encodeWalletAddressParam,
} from "@/shared/lib/wallet-route.utils";
import {
  sanitizeWalletAccountBalances,
  sanitizeWalletEventsPage,
  sanitizeWalletSwapStats,
} from "@/shared/lib/hidden-jettons.utils";

interface WalletSummaryResponse {
  totalEvents: number;
  syncState: WalletSummaryData["syncState"];
  stats: WalletSummaryData["stats"];
  swapStats: SerializedWalletSwapStats;
}

export interface WalletSummaryQueryResult {
  totalEvents: number;
  syncState: WalletSummaryData["syncState"];
  stats: WalletSummaryData["stats"];
  swapStats: WalletSwapStatsResult;
}

function walletApiBase(address: string): string {
  return `/api/wallets/${encodeWalletAddressParam(address)}`;
}

export async function fetchWalletSummary(address: string): Promise<WalletSummaryQueryResult> {
  const data = await apiClient<WalletSummaryResponse>(`${walletApiBase(address)}/summary`);

  return {
    totalEvents: data.totalEvents,
    syncState: data.syncState,
    stats: data.stats,
    swapStats: sanitizeWalletSwapStats(reviveWalletSwapStats(data.swapStats)),
  };
}

export function fetchWalletBalances(address: string): Promise<WalletAccountBalances> {
  return apiClient<SerializedWalletAccountBalances>(`${walletApiBase(address)}/balances`).then(data =>
    sanitizeWalletAccountBalances(reviveWalletAccountBalances(data))
  );
}

export function fetchWalletEvents(
  address: string,
  page: number,
  filters: WalletHistoryFilters
): Promise<WalletEventsPageData> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  applyWalletHistoryFiltersToSearchParams(params, filters);

  return apiClient<WalletEventsPageData>(`${walletApiBase(address)}/events?${params.toString()}`).then(
    sanitizeWalletEventsPage
  );
}
