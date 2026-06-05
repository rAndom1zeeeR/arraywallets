import { NextRequest, NextResponse } from "next/server";
import { Address } from "@ton/core";
import { auth } from "@/auth";
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
  getSyncState,
  countIncompleteEvents,
  SYNC_BATCH_SIZE,
} from "@/modules/wallet/application/sync-service";
import {
  filterEventsNewerThanSynced,
  filterEventsOlderThanSynced,
  getWalletSyncBoundaries,
  isPageFullyInsideSyncedSpan,
  isTailBoundarySatisfied,
  type WalletSyncBoundaries,
} from "@/modules/wallet/application/wallet-sync-boundaries";
import {
  backfillMissingAccountEvents,
  countMissingTonEvents,
} from "@/modules/wallet/application/wallet-missing-events.service";
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
  backfilled: number;
  traceSwapsRepaired: number;
  swapsRepaired: number;
  errors: number;
  actionsSaved: number;
  eventsFetched: number;
  pagesSkippedInSpan: number;
}

function createTotals(): SyncTotals {
  return {
    saved: 0,
    skipped: 0,
    repaired: 0,
    backfilled: 0,
    traceSwapsRepaired: 0,
    swapsRepaired: 0,
    errors: 0,
    actionsSaved: 0,
    eventsFetched: 0,
    pagesSkippedInSpan: 0,
  };
}

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

/**
 * Fetches pages from chain head while lt > newestInDb.
 * Stops when a full page lies inside [oldestLt, newestLt] — no DB round-trip.
 */
async function syncNewestEvents(
  parsedAddress: Address,
  walletAddress: string,
  totals: SyncTotals,
  maxPages: number,
  signal: AbortSignal,
  boundaries: WalletSyncBoundaries
): Promise<void> {
  let beforeLt: bigint | undefined;
  let pages = 0;

  while (pages < maxPages) {
    throwIfAborted(signal);
    const events = await fetchAccountEventsPage(parsedAddress, signal, beforeLt);
    if (events.length === 0) {
      break;
    }

    if (isPageFullyInsideSyncedSpan(events, boundaries)) {
      totals.pagesSkippedInSpan += 1;
      totals.skipped += events.length;
      break;
    }

    const toSync = filterEventsNewerThanSynced(events, boundaries);
    const inSpanCount = events.length - toSync.length;

    if (inSpanCount > 0) {
      totals.skipped += inSpanCount;
    }

    if (toSync.length === 0) {
      totals.pagesSkippedInSpan += 1;
      break;
    }

    throwIfAborted(signal);
    const batch = await syncAccountEvents(toSync, walletAddress, signal);
    totals.saved += batch.saved;
    totals.skipped += batch.skipped;
    totals.repaired += batch.repaired;
    totals.errors += batch.errors;
    totals.actionsSaved += batch.actionsSaved;
    totals.eventsFetched += toSync.length;

    if (inSpanCount > 0) {
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
 * Extends history before `boundaries.oldestLt` only.
 * Skips pages that do not contain events older than DB oldest (boundary verification, no DB).
 */
async function syncOlderEvents(
  parsedAddress: Address,
  walletAddress: string,
  totals: SyncTotals,
  startBeforeLt: bigint | undefined,
  maxPages: number,
  signal: AbortSignal,
  boundaries: WalletSyncBoundaries | null
): Promise<boolean> {
  let beforeLt = startBeforeLt;
  let pages = 0;

  while (pages < maxPages) {
    throwIfAborted(signal);
    const events = await fetchAccountEventsPage(parsedAddress, signal, beforeLt);
    if (events.length === 0) {
      return false;
    }

    if (boundaries) {
      if (isTailBoundarySatisfied(events, boundaries)) {
        totals.pagesSkippedInSpan += 1;
        totals.skipped += events.length;
        return false;
      }

      const toSync = filterEventsOlderThanSynced(events, boundaries);
      const inSpanCount = events.length - toSync.length;

      if (inSpanCount > 0) {
        totals.skipped += inSpanCount;
      }

      if (toSync.length === 0) {
        totals.pagesSkippedInSpan += 1;
        return false;
      }

      await processEventsPage(toSync, walletAddress, totals, signal);
    } else {
      await processEventsPage(events, walletAddress, totals, signal);
    }

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
    backfilled: totals.backfilled,
    traceSwapsRepaired: totals.traceSwapsRepaired,
    swapsRepaired: totals.swapsRepaired,
    errors: totals.errors,
    actionsSaved: totals.actionsSaved,
    hasMore,
    historyComplete,
    incrementalOnly,
    pagesSkippedInSpan: totals.pagesSkippedInSpan,
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
      const session = await auth();
      if (session?.user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Force resync is available for admins only" },
          { status: 403 }
        );
      }

      const cleared = await clearWalletSyncData(normalizedAddress);
      clearedEvents = cleared.eventsDeleted;
      console.log(`Force resync: cleared ${cleared.eventsDeleted} events, ${cleared.rawEventsDeleted} raw`);
    }

    const [existingSyncState, boundaries] = await Promise.all([
      shouldContinueFromLast ? getSyncState(normalizedAddress) : Promise.resolve(null),
      shouldContinueFromLast ? getWalletSyncBoundaries(normalizedAddress) : Promise.resolve(null),
    ]);

    historyComplete = existingSyncState?.historyComplete ?? false;

    const incompleteEventsBeforeSync =
      shouldContinueFromLast && historyComplete ? await countIncompleteEvents(normalizedAddress) : 0;

    const signal = request.signal;
    const maxPages = fetchAll ? Number.POSITIVE_INFINITY : maxPagesPerRun;
    const fetchEventsPage = (beforeLt?: bigint) => fetchAccountEventsPage(parsedAddress, signal, beforeLt);

    const missingEventsBeforeSync =
      shouldContinueFromLast && boundaries !== null
        ? (await countMissingTonEvents(fetchEventsPage, normalizedAddress, maxPagesPerRun)).missing
        : 0;

    incrementalOnly =
      shouldContinueFromLast &&
      boundaries !== null &&
      historyComplete &&
      incompleteEventsBeforeSync === 0 &&
      missingEventsBeforeSync === 0;

    await updateSyncState(normalizedAddress, { status: ChainSyncStatus.SYNCING });

    const shouldRunRepair = shouldRepair && !incrementalOnly;

    let deletedIncompleteEvents = 0;

    if (shouldRunRepair) {
      const repairResult = await repairIncompleteEvents(normalizedAddress);
      deletedIncompleteEvents = repairResult.deleted;
      totals.traceSwapsRepaired = await repairTraceInferredSwapEvents(normalizedAddress);
      totals.swapsRepaired = await repairJettonSwapActionFields(normalizedAddress);
      totals.repaired += repairResult.fixed;

      if (deletedIncompleteEvents > 0) {
        incrementalOnly = false;
      }

      console.log(
        `Repaired: ${repairResult.fixed} events (${repairResult.rebuiltInPlace} rebuilt, ${repairResult.deleted} deleted), trace swaps ${totals.traceSwapsRepaired}, fixed ${totals.swapsRepaired} swap rows`
      );
    }

    if (shouldRunRepair || missingEventsBeforeSync > 0) {
      const backfill = await backfillMissingAccountEvents(
        fetchEventsPage,
        normalizedAddress,
        signal,
        maxPages
      );
      totals.backfilled = backfill.saved;
      totals.saved += backfill.saved;
      totals.errors += backfill.errors;
      totals.eventsFetched += backfill.scanned;
      totals.actionsSaved += backfill.actionsSaved;

      if (backfill.saved > 0) {
        incrementalOnly = false;
        historyComplete = false;
      }

      if (backfill.missing > 0) {
        console.log(
          `Backfilled ${backfill.saved}/${backfill.missing} missing events (scanned ${backfill.scanned} from TonAPI)`
        );
      }
    }

    if (boundaries) {
      await syncNewestEvents(
        parsedAddress,
        normalizedAddress,
        totals,
        Math.min(HEAD_PAGES_LIMIT, maxPages),
        signal,
        boundaries
      );
      resumeBeforeLt = boundaries.oldestLt;
    }

    if (incrementalOnly) {
      hasMore = false;
    } else {
      const tailBeforeLt = boundaries?.oldestLt;
      hasMore = await syncOlderEvents(
        parsedAddress,
        normalizedAddress,
        totals,
        tailBeforeLt,
        maxPages,
        signal,
        boundaries
      );
      historyComplete = !hasMore;
    }

    const missingEventsAfterSync = (await countMissingTonEvents(fetchEventsPage, normalizedAddress, maxPages)).missing;
    if (missingEventsAfterSync > 0) {
      historyComplete = false;
      hasMore = true;
    }

    const finalStatus = totals.errors > 0 ? ChainSyncStatus.ERROR : ChainSyncStatus.COMPLETED;
    await updateSyncState(normalizedAddress, {
      status: finalStatus,
      eventsSynced: totals.saved,
      actionsSynced: totals.actionsSaved,
      error: totals.errors > 0 ? `${totals.errors} events failed` : undefined,
      historyComplete,
    });

    const stats = await getWalletStats(normalizedAddress).catch(error => {
      console.error("getWalletStats after sync failed:", error);
      return undefined;
    });

    const shouldRefreshPnl = totals.saved > 0 || totals.repaired > 0;

    if (shouldRefreshPnl) {
      try {
        await getWalletSwapStats(normalizedAddress);
      } catch (pnlError) {
        console.error("Wallet PnL materialization failed:", pnlError);
      }
    }

    return NextResponse.json({
      ...buildSyncResponse(normalizedAddress, totals, hasMore, resumeBeforeLt, false, historyComplete, incrementalOnly),
      force,
      clearedEvents,
      oldestSyncedLt: boundaries?.oldestLt.toString() ?? null,
      newestSyncedLt: boundaries?.newestLt.toString() ?? null,
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

      const boundaries = normalizedAddress ? await getWalletSyncBoundaries(normalizedAddress) : null;

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
        oldestSyncedLt: boundaries?.oldestLt.toString() ?? null,
        newestSyncedLt: boundaries?.newestLt.toString() ?? null,
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
  const [syncState, stats, boundaries] = await Promise.all([
    getSyncState(normalized),
    getWalletStats(normalized),
    getWalletSyncBoundaries(normalized),
  ]);

  return NextResponse.json({
    address: normalized,
    syncState,
    stats,
    oldestSyncedLt: boundaries?.oldestLt.toString() ?? null,
    newestSyncedLt: boundaries?.newestLt.toString() ?? null,
  });
}
