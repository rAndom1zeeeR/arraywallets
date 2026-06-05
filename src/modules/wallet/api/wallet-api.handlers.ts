import { Address } from "@ton/core";
import { getEventsCount, getSyncState } from "@/modules/wallet/application/wallet-page.queries";
import { getWalletHistoryPage } from "@/modules/wallet/application/wallet-history.queries";
import { getWalletStats } from "@/modules/wallet/application/sync-service";
import { getWalletSwapStats } from "@/modules/swap/application/swap-stats.service";
import { decodeWalletAddressParam } from "@/shared/lib/wallet-route.utils";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";

export function parseWalletAddressParam(param: string): string {
  const decoded = decodeWalletAddressParam(param);
  const address = Address.parse(decoded);
  return normalizeWalletAddress(address.toString());
}

export interface WalletSummaryData {
  totalEvents: number;
  syncState: Awaited<ReturnType<typeof getSyncState>>;
  stats: Awaited<ReturnType<typeof getWalletStats>>;
  swapStats: Awaited<ReturnType<typeof getWalletSwapStats>>;
}

export async function loadWalletSummary(address: string): Promise<WalletSummaryData> {
  const [totalEvents, syncState, stats, swapStats] = await Promise.all([
    getEventsCount(address),
    getSyncState(address),
    getWalletStats(address),
    getWalletSwapStats(address),
  ]);

  return { totalEvents, syncState, stats, swapStats };
}

export interface WalletEventsPageData {
  /** Filtered rows count used for pagination (actions or incomplete events). */
  totalActions: number;
  totalPages: number;
  safePage: number;
  events: EventWithActions[];
  /** @deprecated Use totalActions — kept for older clients */
  totalEvents: number;
}

export async function loadWalletEventsPage(
  address: string,
  page: number,
  filters: WalletHistoryFilters
): Promise<WalletEventsPageData> {
  const [historyPage, totalEvents] = await Promise.all([
    getWalletHistoryPage(address, page, filters),
    getEventsCount(address),
  ]);

  return {
    totalActions: historyPage.totalActions,
    totalPages: historyPage.totalPages,
    safePage: historyPage.safePage,
    events: historyPage.events,
    totalEvents,
  };
}
