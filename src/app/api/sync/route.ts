import { NextRequest, NextResponse } from "next/server";
import { Address } from "@ton/core";
import { AccountEvent } from "@/shared/infrastructure/api/tonapi";
import { TONAPI_CLIENT } from "@/shared/infrastructure/api/tonapi-client";
import { callTonapi, isTonApiRateLimitError } from "@/shared/infrastructure/tonapi/tonapi-limiter";
import { isSyncCancelledError, throwIfAborted } from "@/shared/infrastructure/sync/sync-abort";
import { ChainSyncStatus } from "@/shared/infrastructure/api/prisma-client";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import {
  syncAccountEvents,
  updateSyncState,
  repairIncompleteEvents,
  repairTraceInferredSwapEvents,
  clearWalletSyncData,
  getWalletStats,
  getOldestSyncedLt,
  getSyncState,
  countQuickIncompleteEvents,
  SYNC_BATCH_SIZE,
} from "@/modules/wallet/application/sync-service";
import { getWalletSwapStats, repairJettonSwapActionFields } from "@/modules/swap/application/swap-stats.service";

const API_PAGE_SIZE = SYNC_BATCH_SIZE;
const DEFAULT_MAX_PAGES_PER_RUN = 30;
const HEAD_PAGES_LIMIT = 5;

interface SyncRequestBody {
  address?: string;
  limit?: number;
  fetchAll?: boolean;
  repair?: boolean;
  continueFromLast?: boolean;
  maxPagesPerRun?: number;
  /** Wipe wallet data in DB and sync from scratch. */
  force?: boolean;
}

interface SyncTotals {
  saved: number;
  skipped: number;
  repaired: number;
  traceSwapsRepaired: number;
  swapsRepaired: number;
  errors: number;
  actionsSaved: number;
  eventsFetched: number;
}

function createTotals(): SyncTotals {
  return {
    saved: 0,
    skipped: 0,
    repaired: 0,
    traceSwapsRepaired: 0,
    swapsRepaired: 0,
    errors: 0,
    actionsSaved: 0,
    eventsFetched: 0,
  };
}

// function mergeTotals(target: SyncTotals, source: SyncTotals): void {
//   target.saved += source.saved;
//   target.skipped += source.skipped;
//   target.repaired += source.repaired;
//   target.errors += source.errors;
//   target.actionsSaved += source.actionsSaved;
//   target.eventsFetched += source.eventsFetched;
// }

async function fetchAccountEventsPage(
  parsedAddress: Address,
  signal: AbortSignal,
  beforeLt?: bigint
): Promise<AccountEvent[]> {
  throwIfAborted(signal);

  const response = await callTonapi(
    () =>
      TONAPI_CLIENT.getAccountEvents(parsedAddress, {
        limit: API_PAGE_SIZE,
        before_lt: beforeLt,
      }),
    signal
  );

  throwIfAborted(signal);
  return response.events;
}

async function processEventsPage(
  events: AccountEvent[],
  walletAddress: string,
  totals: SyncTotals,
  signal: AbortSignal
): Promise<void> {
  throwIfAborted(signal);
  const result = await syncAccountEvents(events, walletAddress, signal);
  totals.saved += result.saved;
  totals.skipped += result.skipped;
  totals.repaired += result.repaired;
  totals.errors += result.errors;
  totals.actionsSaved += result.actionsSaved;
  totals.eventsFetched += events.length;
}

function isFullySkippedPage(
  eventsCount: number,
  result: { saved: number; repaired: number; skipped: number }
): boolean {
  return eventsCount > 0 && result.saved === 0 && result.repaired === 0 && result.skipped === eventsCount;
}

/**
 * Fetches newest pages until all events are already in DB (new txs since last sync).
 */
async function syncNewestEvents(
  parsedAddress: Address,
  walletAddress: string,
  totals: SyncTotals,
  maxPages: number,
  signal: AbortSignal
): Promise<void> {
  let beforeLt: bigint | undefined;
  let pages = 0;

  while (pages < maxPages) {
    throwIfAborted(signal);
    const events = await fetchAccountEventsPage(parsedAddress, signal, beforeLt);
    if (events.length === 0) {
      break;
    }

    throwIfAborted(signal);
    const batch = await syncAccountEvents(events, walletAddress, signal);
    totals.saved += batch.saved;
    totals.skipped += batch.skipped;
    totals.repaired += batch.repaired;
    totals.errors += batch.errors;
    totals.actionsSaved += batch.actionsSaved;
    totals.eventsFetched += events.length;

    if (isFullySkippedPage(events.length, batch)) {
      break;
    }

    const lastEvent = events[events.length - 1];
    beforeLt = lastEvent.lt;
    pages++;

    if (events.length < API_PAGE_SIZE) {
      break;
    }
  }
}

/**
 * Fetches older history using `before_lt` from the oldest event already in DB.
 */
async function syncOlderEvents(
  parsedAddress: Address,
  walletAddress: string,
  totals: SyncTotals,
  startBeforeLt: bigint | undefined,
  maxPages: number,
  signal: AbortSignal
): Promise<boolean> {
  let beforeLt = startBeforeLt;
  let pages = 0;

  while (pages < maxPages) {
    throwIfAborted(signal);
    const events = await fetchAccountEventsPage(parsedAddress, signal, beforeLt);
    if (events.length === 0) {
      return false;
    }

    await processEventsPage(events, walletAddress, totals, signal);

    const lastEvent = events[events.length - 1];
    beforeLt = lastEvent.lt;

    await updateSyncState(walletAddress, {
      lastLt: beforeLt.toString(),
      lastTimestamp: new Date(lastEvent.timestamp * 1000),
      lastTonEventId: lastEvent.eventId,
      eventsSynced: totals.saved,
      actionsSynced: totals.actionsSaved,
    });

    pages++;

    if (events.length < API_PAGE_SIZE) {
      return false;
    }
  }

  return true;
}

function buildSyncResponse(
  normalizedAddress: string,
  totals: SyncTotals,
  hasMore: boolean,
  resumeBeforeLt: bigint | undefined,
  cancelled: boolean,
  historyComplete: boolean,
  incrementalOnly: boolean
) {
  return {
    success: !cancelled,
    cancelled,
    address: normalizedAddress,
    eventsFetched: totals.eventsFetched,
    saved: totals.saved,
    skipped: totals.skipped,
    repaired: totals.repaired,
    traceSwapsRepaired: totals.traceSwapsRepaired,
    swapsRepaired: totals.swapsRepaired,
    errors: totals.errors,
    actionsSaved: totals.actionsSaved,
    hasMore,
    historyComplete,
    incrementalOnly,
    continuedFromLt: resumeBeforeLt?.toString() ?? null,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let normalizedAddress: string | undefined;
  const totals = createTotals();
  let resumeBeforeLt: bigint | undefined;
  let hasMore = false;
  let historyComplete = false;
  let incrementalOnly = false;

  try {
    const body = (await request.json()) as SyncRequestBody;
    const {
      address,
      fetchAll = false,
      force = false,
      repair = false,
      continueFromLast = true,
      maxPagesPerRun = DEFAULT_MAX_PAGES_PER_RUN,
    } = body;

    const shouldRepair = repair && !force;
    const shouldContinueFromLast = continueFromLast && !force;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    let parsedAddress: Address;
    try {
      parsedAddress = Address.parse(address);
    } catch {
      return NextResponse.json({ error: "Invalid TON address" }, { status: 400 });
    }

    normalizedAddress = toRawTonAddress(parsedAddress);

    let clearedEvents = 0;

    if (force) {
      const cleared = await clearWalletSyncData(normalizedAddress);
      clearedEvents = cleared.eventsDeleted;
      console.log(`Force resync: cleared ${cleared.eventsDeleted} events, ${cleared.rawEventsDeleted} raw`);
    }

    const [existingSyncState, oldestLtBefore] = await Promise.all([
      shouldContinueFromLast ? getSyncState(normalizedAddress) : Promise.resolve(null),
      shouldContinueFromLast ? getOldestSyncedLt(normalizedAddress) : Promise.resolve(null),
    ]);

    historyComplete = existingSyncState?.historyComplete ?? false;

    const quickIncompleteEvents =
      shouldContinueFromLast && historyComplete
        ? await countQuickIncompleteEvents(normalizedAddress)
        : 0;

    incrementalOnly =
      shouldContinueFromLast && historyComplete && quickIncompleteEvents === 0;

    await updateSyncState(normalizedAddress, { status: ChainSyncStatus.SYNCING });

    const shouldRunRepair = shouldRepair && !incrementalOnly;

    if (shouldRunRepair) {
      const deleted = await repairIncompleteEvents(normalizedAddress);
      totals.traceSwapsRepaired = await repairTraceInferredSwapEvents(normalizedAddress);
      totals.swapsRepaired = await repairJettonSwapActionFields(normalizedAddress);
      totals.repaired += deleted;
      console.log(
        `Repaired: deleted ${deleted} incomplete events, trace swaps ${totals.traceSwapsRepaired}, fixed ${totals.swapsRepaired} swap rows`
      );
    }

    const maxPages = fetchAll ? Number.POSITIVE_INFINITY : maxPagesPerRun;
    const signal = request.signal;

    // New transactions (only when we already have history in DB)
    if (shouldContinueFromLast && oldestLtBefore !== null) {
      await syncNewestEvents(parsedAddress, normalizedAddress, totals, Math.min(HEAD_PAGES_LIMIT, maxPages), signal);
    }

    resumeBeforeLt = shouldContinueFromLast && oldestLtBefore !== null ? oldestLtBefore : undefined;

    if (incrementalOnly) {
      hasMore = false;
    } else {
      hasMore = await syncOlderEvents(parsedAddress, normalizedAddress, totals, resumeBeforeLt, maxPages, signal);
      historyComplete = !hasMore;
    }

    const finalStatus = totals.errors > 0 ? ChainSyncStatus.ERROR : ChainSyncStatus.COMPLETED;
    await updateSyncState(normalizedAddress, {
      status: finalStatus,
      eventsSynced: totals.saved,
      actionsSynced: totals.actionsSaved,
      error: totals.errors > 0 ? `${totals.errors} events failed` : undefined,
      historyComplete,
    });

    const stats =
      incrementalOnly && totals.saved === 0 && totals.repaired === 0
        ? undefined
        : await getWalletStats(normalizedAddress).catch(error => {
            console.error("getWalletStats after sync failed:", error);
            return undefined;
          });
    const oldestLtAfter = await getOldestSyncedLt(normalizedAddress);

    const shouldRefreshPnl = totals.saved > 0 || totals.repaired > 0 || !incrementalOnly;

    if (shouldRefreshPnl) {
      try {
        await getWalletSwapStats(normalizedAddress);
      } catch (pnlError) {
        console.error("Wallet PnL materialization failed:", pnlError);
      }
    }

    return NextResponse.json({
      ...buildSyncResponse(
        normalizedAddress,
        totals,
        hasMore,
        resumeBeforeLt,
        false,
        historyComplete,
        incrementalOnly
      ),
      force,
      clearedEvents,
      oldestSyncedLt: oldestLtAfter?.toString() ?? null,
      stats,
    });
  } catch (error) {
    if (isSyncCancelledError(error) || request.signal.aborted) {
      if (normalizedAddress) {
        await updateSyncState(normalizedAddress, {
          status: ChainSyncStatus.PAUSED,
          eventsSynced: totals.saved,
          actionsSynced: totals.actionsSaved,
          error: undefined,
        });
      }

      const stats = normalizedAddress
        ? await getWalletStats(normalizedAddress).catch(error => {
            console.error("getWalletStats after cancel failed:", error);
            return undefined;
          })
        : undefined;
      const oldestLtAfter = normalizedAddress ? await getOldestSyncedLt(normalizedAddress) : null;

      return NextResponse.json({
        ...buildSyncResponse(
          normalizedAddress ?? "",
          totals,
          hasMore,
          resumeBeforeLt,
          true,
          historyComplete,
          incrementalOnly
        ),
        oldestSyncedLt: oldestLtAfter?.toString() ?? null,
        stats,
      });
    }

    console.error("Sync error:", error);

    const isRateLimited = isTonApiRateLimitError(error);

    if (normalizedAddress) {
      await updateSyncState(normalizedAddress, {
        status: ChainSyncStatus.ERROR,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json(
      {
        error: isRateLimited ? "TonAPI rate limit" : "Sync failed",
        message: error instanceof Error ? error.message : String(error),
        traceSwapsRepaired: totals.traceSwapsRepaired,
        swapsRepaired: totals.swapsRepaired,
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const normalized = toRawTonAddress(address);
  const [syncState, stats, oldestLt] = await Promise.all([
    getSyncState(normalized),
    getWalletStats(normalized),
    getOldestSyncedLt(normalized),
  ]);

  return NextResponse.json({
    address: normalized,
    syncState,
    stats,
    oldestSyncedLt: oldestLt?.toString() ?? null,
  });
}
