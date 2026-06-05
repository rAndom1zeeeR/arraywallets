import { apiClient } from "@/shared/infrastructure/api/client";
import type { WalletSummaryData, WalletEventsPageData } from "@/modules/wallet/api/wallet-api.handlers";
import { reviveWalletSwapStats, type SerializedWalletSwapStats } from "@/modules/wallet/api/wallet-api.adapter";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import {
  encodeWalletAddressParam,
  walletHistoryFiltersToQueryOptions,
} from "@/shared/lib/wallet-route.utils";

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
    swapStats: reviveWalletSwapStats(data.swapStats),
  };
}

export function fetchWalletEvents(
  address: string,
  page: number,
  filters: WalletHistoryFilters
): Promise<WalletEventsPageData> {
  const params = new URLSearchParams();
  params.set("page", String(page));

  const queryOptions = walletHistoryFiltersToQueryOptions(filters);
  if (queryOptions.type) {
    params.set("type", queryOptions.type);
  }
  if (queryOptions.status) {
    params.set("status", queryOptions.status);
  }
  if (queryOptions.direction) {
    params.set("direction", queryOptions.direction);
  }
  if (queryOptions.from) {
    params.set("from", queryOptions.from);
  }
  if (queryOptions.to) {
    params.set("to", queryOptions.to);
  }

  return apiClient<WalletEventsPageData>(`${walletApiBase(address)}/events?${params.toString()}`);
}
