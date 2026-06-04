import { apiClient } from "@/shared/api/client";
import type { WalletSummaryData, WalletEventsPageData } from "@/features/sync-events/api/wallet-api.handlers";
import { reviveWalletSwapStats, type SerializedWalletSwapStats } from "@/features/sync-events/lib/wallet-api.adapter";
import type { WalletSwapStatsResult } from "@/features/sync-events/model/swap-stats.service";
import { encodeWalletAddressParam } from "@/shared/lib/wallet-route.utils";

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

export function fetchWalletEvents(address: string, page: number, swapsOnly: boolean): Promise<WalletEventsPageData> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (swapsOnly) {
    params.set("swaps", "1");
  }

  return apiClient<WalletEventsPageData>(`${walletApiBase(address)}/events?${params.toString()}`);
}
