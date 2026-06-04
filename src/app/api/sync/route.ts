import { NextRequest, NextResponse } from "next/server";
import { Address } from "@ton/core";
import { AccountEvent } from "@ton-api/client";
import { TONAPI_CLIENT } from "@/shared/api/tonapi-client";
import { RateLimiter } from "@/shared/lib/rate-limiter";
import { normalizeWalletAddress } from "@/shared/lib/ton-address";
import {
  syncAccountEvents,
  updateSyncState,
  repairIncompleteEvents,
  getWalletStats,
  getOldestSyncedLt,
  getSyncState,
} from "@/features/sync-events/model/sync-service";

const API_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES_PER_RUN = 30;
const HEAD_PAGES_LIMIT = 5;

interface SyncRequestBody {
  address?: string;
  limit?: number;
  fetchAll?: boolean;
  repair?: boolean;
  continueFromLast?: boolean;
  maxPagesPerRun?: number;
}

interface SyncTotals {
  saved: number;
  skipped: number;
  repaired: number;
  errors: number;
  actionsSaved: number;
  eventsFetched: number;
}

function createTotals(): SyncTotals {
  return {
    saved: 0,
    skipped: 0,
    repaired: 0,
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
  limiter: RateLimiter,
  beforeLt?: bigint
): Promise<AccountEvent[]> {
  const response = await limiter.throttle(() =>
    TONAPI_CLIENT.accounts.getAccountEvents(parsedAddress, {
      limit: API_PAGE_SIZE,
      before_lt: beforeLt,
    })
  );

  return response.events;
}

async function processEventsPage(events: AccountEvent[], walletAddress: string, totals: SyncTotals): Promise<void> {
  const result = await syncAccountEvents(events, walletAddress);
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
  limiter: RateLimiter,
  totals: SyncTotals,
  maxPages: number
): Promise<void> {
  let beforeLt: bigint | undefined;
  let pages = 0;

  while (pages < maxPages) {
    const events = await fetchAccountEventsPage(parsedAddress, limiter, beforeLt);
    if (events.length === 0) {
      break;
    }

    const batch = await syncAccountEvents(events, walletAddress);
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
  limiter: RateLimiter,
  totals: SyncTotals,
  startBeforeLt: bigint | undefined,
  maxPages: number
): Promise<boolean> {
  let beforeLt = startBeforeLt;
  let pages = 0;

  while (pages < maxPages) {
    const events = await fetchAccountEventsPage(parsedAddress, limiter, beforeLt);
    if (events.length === 0) {
      return false;
    }

    await processEventsPage(events, walletAddress, totals);

    const lastEvent = events[events.length - 1];
    beforeLt = lastEvent.lt;

    await updateSyncState(walletAddress, {
      lastLt: beforeLt.toString(),
      lastTimestamp: new Date(lastEvent.timestamp * 1000),
      lastEventId: lastEvent.eventId,
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  let normalizedAddress: string | undefined;

  try {
    const body = (await request.json()) as SyncRequestBody;
    const {
      address,
      fetchAll = false,
      repair = false,
      continueFromLast = true,
      maxPagesPerRun = DEFAULT_MAX_PAGES_PER_RUN,
    } = body;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    let parsedAddress: Address;
    try {
      parsedAddress = Address.parse(address);
    } catch {
      return NextResponse.json({ error: "Invalid TON address" }, { status: 400 });
    }

    normalizedAddress = normalizeWalletAddress(parsedAddress.toString());

    if (repair) {
      const deleted = await repairIncompleteEvents(normalizedAddress);
      console.log(`Repaired: deleted ${deleted} incomplete events`);
    }

    await updateSyncState(normalizedAddress, { status: "syncing" });

    const limiter = new RateLimiter(1100);
    const totals = createTotals();
    const maxPages = fetchAll ? Number.POSITIVE_INFINITY : maxPagesPerRun;

    const oldestLtBefore = continueFromLast ? await getOldestSyncedLt(normalizedAddress) : null;

    // New transactions (only when we already have history in DB)
    if (continueFromLast && oldestLtBefore !== null) {
      await syncNewestEvents(parsedAddress, normalizedAddress, limiter, totals, Math.min(HEAD_PAGES_LIMIT, maxPages));
    }

    const resumeBeforeLt = continueFromLast && oldestLtBefore !== null ? oldestLtBefore : undefined;

    const hasMore = await syncOlderEvents(parsedAddress, normalizedAddress, limiter, totals, resumeBeforeLt, maxPages);

    const finalStatus = totals.errors > 0 ? "error" : "completed";
    await updateSyncState(normalizedAddress, {
      status: finalStatus,
      eventsSynced: totals.saved,
      actionsSynced: totals.actionsSaved,
      error: totals.errors > 0 ? `${totals.errors} events failed` : undefined,
    });

    const stats = await getWalletStats(normalizedAddress);
    const oldestLtAfter = await getOldestSyncedLt(normalizedAddress);

    return NextResponse.json({
      success: true,
      address: normalizedAddress,
      eventsFetched: totals.eventsFetched,
      saved: totals.saved,
      skipped: totals.skipped,
      repaired: totals.repaired,
      errors: totals.errors,
      actionsSaved: totals.actionsSaved,
      hasMore,
      continuedFromLt: resumeBeforeLt?.toString() ?? null,
      oldestSyncedLt: oldestLtAfter?.toString() ?? null,
      stats,
    });
  } catch (error) {
    console.error("Sync error:", error);

    if (normalizedAddress) {
      await updateSyncState(normalizedAddress, {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const normalized = normalizeWalletAddress(address);
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
