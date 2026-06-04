import type { AccountEvent } from "@ton-api/client";
import { Address } from "@ton/core";
import { TONAPI_CLIENT } from "@/shared/api/tonapi-client";
import {
  getWalletLtBounds,
  persistChainRawEventsBatch,
} from "@/entities/chain-events/chain-raw-event.repository";
import {
  ensureChainSyncState,
  getChainSyncCursors,
  markChainSyncCompleted,
  markChainSyncError,
  markChainSyncStarted,
  markForwardScanDone,
  updateBackwardCursor,
  updateForwardCursor,
} from "@/entities/chain-events/chain-sync-state.repository";
import type {
  ChainSyncDirection,
  SyncBatchResult,
  SyncRunResult,
} from "@/entities/chain-events/chain-sync.types";
import { RateLimiter } from "@/shared/lib/rate-limiter";
import { toRawTonAddress } from "@/shared/lib/ton-address";

const PAGE_SIZE = 100;
const tonApiLimiter = new RateLimiter(1100);

const newestLt = (events: AccountEvent[]): bigint => events[0].lt;

const oldestLt = (events: AccountEvent[]): bigint => events[events.length - 1].lt;

const didAdvanceCursor = (cursor: bigint | null, next: bigint): boolean =>
  cursor == null || next !== cursor;

const fetchNewPage = async (
  address: Address,
  afterLt: bigint | null,
): Promise<AccountEvent[]> => {
  const response = await tonApiLimiter.throttle(() =>
    TONAPI_CLIENT.accounts.getAccountEvents(
      address,
      afterLt != null ? { limit: PAGE_SIZE, after_lt: afterLt } : { limit: PAGE_SIZE },
    ),
  );
  return response.events;
};

const fetchOldPage = async (address: Address, beforeLt: bigint): Promise<AccountEvent[]> => {
  const response = await tonApiLimiter.throttle(() =>
    TONAPI_CLIENT.accounts.getAccountEvents(address, {
      limit: PAGE_SIZE,
      before_lt: beforeLt,
    }),
  );
  return response.events;
};

const syncNewBatch = async (
  address: Address,
  walletAddress: string,
  afterLt: bigint | null,
  isInitial: boolean,
): Promise<SyncBatchResult | null> => {
  const cursorBefore = afterLt;
  const newEvents = await fetchNewPage(address, afterLt);

  if (newEvents.length === 0) {
    await markForwardScanDone(walletAddress);
    return null;
  }

  const headLt = newestLt(newEvents);
  const saved = await persistChainRawEventsBatch(newEvents);
  await updateForwardCursor(
    walletAddress,
    saved,
    headLt,
    new Date(newEvents[0].timestamp * 1000),
  );

  const advanced = didAdvanceCursor(cursorBefore, headLt);
  if (saved === 0 && !advanced) {
    await markForwardScanDone(walletAddress);
    return null;
  }

  const direction: ChainSyncDirection = isInitial ? "initial" : "new";
  const hasMore = newEvents.length === PAGE_SIZE;

  return {
    success: true,
    direction,
    fetched: newEvents.length,
    saved,
    hasMore,
  };
};

const syncOldBatch = async (
  address: Address,
  walletAddress: string,
  beforeLt: bigint,
): Promise<SyncBatchResult> => {
  const cursorBefore = beforeLt;
  const oldEvents = await fetchOldPage(address, beforeLt);

  if (oldEvents.length === 0) {
    await markChainSyncCompleted(walletAddress);
    return {
      success: true,
      direction: null,
      fetched: 0,
      saved: 0,
      hasMore: false,
    };
  }

  const tailLt = oldestLt(oldEvents);
  const saved = await persistChainRawEventsBatch(oldEvents);
  await updateBackwardCursor(walletAddress, saved, tailLt);

  const advanced = didAdvanceCursor(cursorBefore, tailLt);
  const hasMore = oldEvents.length === PAGE_SIZE && (saved > 0 || advanced);

  if (!hasMore) {
    await markChainSyncCompleted(walletAddress);
  }

  return {
    success: true,
    direction: "old",
    fetched: oldEvents.length,
    saved,
    hasMore,
  };
};

const syncOneBatchStep = async (address: Address): Promise<SyncBatchResult> => {
  const walletAddress = toRawTonAddress(address);

  const [cursors, bounds] = await Promise.all([
    getChainSyncCursors(walletAddress),
    getWalletLtBounds(walletAddress),
  ]);

  if (!cursors.forwardScanDone) {
    const afterLt = cursors.afterLt ?? bounds.maxLt;
    const isInitial = afterLt == null;
    const newResult = await syncNewBatch(address, walletAddress, afterLt, isInitial);
    if (newResult != null) {
      return newResult;
    }
  }

  const beforeLt = cursors.beforeLt ?? bounds.minLt;
  if (beforeLt == null) {
    await markChainSyncCompleted(walletAddress);
    return {
      success: true,
      direction: null,
      fetched: 0,
      saved: 0,
      hasMore: false,
    };
  }

  return syncOldBatch(address, walletAddress, beforeLt);
};

/** One step: TON API page (100) → `createMany` в `chain_raw_event`. */
export const syncOneBatch = async (address: Address): Promise<SyncBatchResult> => {
  const walletAddress = toRawTonAddress(address);

  try {
    await ensureChainSyncState(walletAddress);
    await markChainSyncStarted(walletAddress);
    return await syncOneBatchStep(address);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markChainSyncError(walletAddress, message).catch(() => undefined);
    return {
      success: false,
      direction: null,
      fetched: 0,
      saved: 0,
      hasMore: false,
      error: message,
    };
  }
};

const DEFAULT_MAX_BATCHES = 10_000;

/**
 * Full sync on server: fetch 100 → save 100 → next page until done.
 * No per-batch round-trips to the browser.
 */
export const syncWalletEventsRun = async (
  address: Address,
  maxBatches: number = DEFAULT_MAX_BATCHES,
): Promise<SyncRunResult> => {
  const walletAddress = toRawTonAddress(address);

  try {
    await ensureChainSyncState(walletAddress);
    await markChainSyncStarted(walletAddress);

    let batches = 0;
    let totalFetched = 0;
    let totalSaved = 0;
    let lastDirection: ChainSyncDirection | null = null;
    let hasMore = true;

    while (hasMore && batches < maxBatches) {
      const result = await syncOneBatchStep(address);
      batches += 1;
      totalFetched += result.fetched;
      totalSaved += result.saved;
      if (result.direction != null) {
        lastDirection = result.direction;
      }
      hasMore = result.hasMore;

      if (!result.success) {
        return {
          success: false,
          batches,
          totalFetched,
          totalSaved,
          lastDirection,
          hasMore: false,
          error: result.error,
        };
      }
    }

    return {
      success: true,
      batches,
      totalFetched,
      totalSaved,
      lastDirection,
      hasMore: hasMore && batches >= maxBatches,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markChainSyncError(walletAddress, message).catch(() => undefined);
    return {
      success: false,
      batches: 0,
      totalFetched: 0,
      totalSaved: 0,
      lastDirection: null,
      hasMore: false,
      error: message,
    };
  }
};
