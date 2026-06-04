import { prisma } from "@/shared/infrastructure/api/prisma";
import type { ChainSyncStatusValue } from "@/shared/constants/chain-prisma.enums";
import { normalizeWalletAddress, tryToRawTonAddress } from "@/shared/lib/ton/ton-address";
import type { AnalyzedWalletListItem } from "@/modules/wallet/domain/wallets-list.types";

function mergeCountMap(
  target: Map<string, number>,
  rows: Array<{ walletAddress: string; _count: { _all: number } }>
): void {
  for (const row of rows) {
    const raw = tryToRawTonAddress(row.walletAddress) ?? row.walletAddress;
    target.set(raw, (target.get(raw) ?? 0) + row._count._all);
  }
}

/**
 * Returns wallets that were synced or have events stored in DB.
 */
export async function getAnalyzedWallets(): Promise<AnalyzedWalletListItem[]> {
  const [syncStates, eventCounts, actionCounts, eventOnlyAddresses] = await Promise.all([
    prisma.chainSyncState.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prisma.chainEvent.groupBy({
      by: ["walletAddress"],
      _count: { _all: true },
    }),
    prisma.chainAction.groupBy({
      by: ["walletAddress"],
      _count: { _all: true },
    }),
    prisma.chainEvent.findMany({
      distinct: ["walletAddress"],
      select: { walletAddress: true },
    }),
  ]);

  const eventsByRaw = new Map<string, number>();
  const actionsByRaw = new Map<string, number>();
  mergeCountMap(eventsByRaw, eventCounts);
  mergeCountMap(actionsByRaw, actionCounts);

  const walletMap = new Map<string, AnalyzedWalletListItem>();

  for (const state of syncStates) {
    const raw = tryToRawTonAddress(state.walletAddress) ?? state.walletAddress;

    walletMap.set(raw, {
      address: normalizeWalletAddress(state.walletAddress),
      rawAddress: raw,
      status: state.status as ChainSyncStatusValue,
      eventsSynced: state.eventsSynced,
      actionsSynced: state.actionsSynced,
      eventsCount: eventsByRaw.get(raw) ?? 0,
      actionsCount: actionsByRaw.get(raw) ?? 0,
      lastUpdated: state.updatedAt.toISOString(),
      completedAt: state.completedAt?.toISOString() ?? null,
      error: state.error,
    });
  }

  for (const row of eventOnlyAddresses) {
    const raw = tryToRawTonAddress(row.walletAddress) ?? row.walletAddress;

    if (walletMap.has(raw)) {
      continue;
    }

    walletMap.set(raw, {
      address: normalizeWalletAddress(row.walletAddress),
      rawAddress: raw,
      status: "COMPLETED",
      eventsSynced: eventsByRaw.get(raw) ?? 0,
      actionsSynced: actionsByRaw.get(raw) ?? 0,
      eventsCount: eventsByRaw.get(raw) ?? 0,
      actionsCount: actionsByRaw.get(raw) ?? 0,
      lastUpdated: new Date(0).toISOString(),
      completedAt: null,
      error: null,
    });
  }

  return [...walletMap.values()].sort(
    (left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime()
  );
}
