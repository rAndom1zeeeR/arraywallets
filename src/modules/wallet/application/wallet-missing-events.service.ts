import type { AccountEvent } from "@/shared/infrastructure/api/tonapi";
import { prisma } from "@/shared/infrastructure/api/prisma";
import { throwIfAborted } from "@/shared/infrastructure/sync/sync-abort";
import { getWalletAddressVariants } from "@/shared/lib/ton/ton-address";
import { SYNC_BATCH_SIZE, syncAccountEvents } from "./sync-service";

export type FetchAccountEventsPage = (beforeLt?: bigint) => Promise<AccountEvent[]>;

export interface MissingEventsScanResult {
  scanned: number;
  missing: number;
}

export interface BackfillMissingEventsResult extends MissingEventsScanResult {
  saved: number;
  actionsSaved: number;
  errors: number;
}

/**
 * Loads all `ton_event_id` values already stored for a wallet (any address format).
 */
export async function loadStoredTonEventIds(walletAddress: string): Promise<Set<string>> {
  const walletVariants = getWalletAddressVariants(walletAddress);
  const rows = await prisma.chainEvent.findMany({
    where: { walletAddress: { in: walletVariants } },
    select: { tonEventId: true },
  });

  return new Set(rows.map(row => row.tonEventId));
}

/**
 * Compares TonAPI pagination with DB and returns how many chain events are absent locally.
 */
export async function countMissingTonEvents(
  fetchPage: FetchAccountEventsPage,
  walletAddress: string,
  maxPages: number = Number.POSITIVE_INFINITY
): Promise<MissingEventsScanResult> {
  const storedIds = await loadStoredTonEventIds(walletAddress);
  let beforeLt: bigint | undefined;
  let pages = 0;
  let scanned = 0;
  let missing = 0;

  while (pages < maxPages) {
    const events = await fetchPage(beforeLt);
    if (events.length === 0) {
      break;
    }

    scanned += events.length;
    missing += events.filter(event => !storedIds.has(event.eventId)).length;

    beforeLt = events[events.length - 1].lt;
    pages += 1;

    if (events.length < SYNC_BATCH_SIZE) {
      break;
    }
  }

  return { scanned, missing };
}

/**
 * Re-fetches TonAPI pages and persists events missing from DB — including holes inside [oldestLt, newestLt].
 */
export async function backfillMissingAccountEvents(
  fetchPage: FetchAccountEventsPage,
  walletAddress: string,
  signal?: AbortSignal,
  maxPages: number = Number.POSITIVE_INFINITY
): Promise<BackfillMissingEventsResult> {
  const storedIds = await loadStoredTonEventIds(walletAddress);
  let beforeLt: bigint | undefined;
  let pages = 0;
  let scanned = 0;
  let missing = 0;
  let saved = 0;
  let actionsSaved = 0;
  let errors = 0;

  while (pages < maxPages) {
    throwIfAborted(signal);
    const events = await fetchPage(beforeLt);
    if (events.length === 0) {
      break;
    }

    scanned += events.length;
    const missingEvents = events.filter(event => !storedIds.has(event.eventId));
    missing += missingEvents.length;

    if (missingEvents.length > 0) {
      const result = await syncAccountEvents(missingEvents, walletAddress, signal);
      saved += result.saved;
      actionsSaved += result.actionsSaved;
      errors += result.errors;

      for (const event of missingEvents) {
        storedIds.add(event.eventId);
      }
    }

    beforeLt = events[events.length - 1].lt;
    pages += 1;

    if (events.length < SYNC_BATCH_SIZE) {
      break;
    }
  }

  return { scanned, missing, saved, actionsSaved, errors };
}
