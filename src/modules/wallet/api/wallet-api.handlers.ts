import { Address } from "@ton/core";
import { EVENTS_PAGE_SIZE } from "@/modules/wallet/presentation/components/EventsPagination";
import { getEvents, getEventsCount, getSyncState } from "@/modules/wallet/application/wallet-page.queries";
import { getWalletStats } from "@/modules/wallet/application/sync-service";
import { getWalletSwapStats } from "@/modules/swap/application/swap-stats.service";
import { decodeWalletAddressParam } from "@/shared/lib/wallet-route.utils";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";
import { SWAP_AGGREGATE_ACTION_TYPES } from "@/modules/swap/domain/swap-inference.utils";

const SWAP_EVENTS_FILTER_TYPES = new Set<string>([...SWAP_AGGREGATE_ACTION_TYPES, "FLAWED_HEURISTIC"]);

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
  totalEvents: number;
  totalPages: number;
  safePage: number;
  events: Awaited<ReturnType<typeof getEvents>>;
}

export async function loadWalletEventsPage(
  address: string,
  page: number,
  swapsOnly: boolean
): Promise<WalletEventsPageData> {
  const totalEvents = await getEventsCount(address);
  const totalPages = Math.max(1, Math.ceil(totalEvents / EVENTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const events = await getEvents(address, safePage);

  const visibleEvents = swapsOnly
    ? events
        .map(event => ({
          ...event,
          actions: event.actions.filter(action => SWAP_EVENTS_FILTER_TYPES.has(action.type)),
        }))
        .filter(event => event.actions.length > 0)
    : events;

  return {
    totalEvents,
    totalPages,
    safePage,
    events: visibleEvents,
  };
}
