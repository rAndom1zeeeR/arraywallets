import type { AccountEvent } from "@/shared/infrastructure/api/tonapi";
import { prisma } from "@/shared/infrastructure/api/prisma";
import { getWalletAddressVariants } from "@/shared/lib/ton/ton-address";

/** First (oldest) and last (newest) synced events — TonAPI cursor boundaries. */
export interface WalletSyncBoundaries {
  oldestLt: bigint;
  newestLt: bigint;
  oldestTimestamp: Date;
  newestTimestamp: Date;
}

/**
 * Loads lt/timestamp pointers for the synced span in DB (one round-trip).
 */
export async function getWalletSyncBoundaries(
  walletAddress: string
): Promise<WalletSyncBoundaries | null> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const [oldest, newest] = await Promise.all([
    prisma.chainEvent.findFirst({
      where: { walletAddress: { in: walletVariants } },
      orderBy: { lt: "asc" },
      select: { lt: true, timestamp: true },
    }),
    prisma.chainEvent.findFirst({
      where: { walletAddress: { in: walletVariants } },
      orderBy: { lt: "desc" },
      select: { lt: true, timestamp: true },
    }),
  ]);

  if (!oldest?.lt || !newest?.lt) {
    return null;
  }

  return {
    oldestLt: BigInt(oldest.lt.toString()),
    newestLt: BigInt(newest.lt.toString()),
    oldestTimestamp: oldest.timestamp,
    newestTimestamp: newest.timestamp,
  };
}

export function isEventInsideSyncedSpan(lt: bigint, boundaries: WalletSyncBoundaries): boolean {
  return lt >= boundaries.oldestLt && lt <= boundaries.newestLt;
}

/** Head walk: only events newer than the newest row already in DB. */
export function filterEventsNewerThanSynced(events: AccountEvent[], boundaries: WalletSyncBoundaries): AccountEvent[] {
  return events.filter(event => event.lt > boundaries.newestLt);
}

/** Tail walk (`before_lt` from oldest): only events older than the oldest row in DB. */
export function filterEventsOlderThanSynced(events: AccountEvent[], boundaries: WalletSyncBoundaries): AccountEvent[] {
  return events.filter(event => event.lt < boundaries.oldestLt);
}

/**
 * True when a TonAPI page (newest→older) is entirely inside [oldestLt, newestLt] — skip without DB.
 */
export function isPageFullyInsideSyncedSpan(events: AccountEvent[], boundaries: WalletSyncBoundaries): boolean {
  return events.length > 0 && events.every(event => isEventInsideSyncedSpan(event.lt, boundaries));
}

/**
 * Tail boundary check: page has no events older than DB oldest — history at the start is complete.
 */
export function isTailBoundarySatisfied(events: AccountEvent[], boundaries: WalletSyncBoundaries): boolean {
  return events.length > 0 && filterEventsOlderThanSynced(events, boundaries).length === 0;
}
