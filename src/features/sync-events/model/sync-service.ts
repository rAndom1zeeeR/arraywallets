import { randomUUID } from "node:crypto";
import { AccountEvent } from "@/shared/api/tonapi";
import { ChainJettonVerification, ChainSyncStatus, Prisma } from "@/shared/api/prisma-client";
import { prisma } from "@/shared/api/prisma";
import { toRawTonAddress, getWalletAddressVariants, collectMatchingWalletAddressKeys } from "@/shared/lib/ton-address";
import { serializeForJson } from "@/shared/lib/serialize-json";
import { isSyncCancelledError, throwIfAborted } from "@/shared/lib/sync-abort";
import { transformAccountEvent, TransformedEvent, TransformedAddress, TransformedJetton } from "./transformer";

/** Matches TonAPI page size (`limit: 100`). */
export const SYNC_BATCH_SIZE = 100;

interface SyncBatchResult {
  saved: number;
  skipped: number;
  repaired: number;
  errors: number;
  actionsSaved: number;
}

interface RawEventPayload {
  actions?: unknown[];
}

const mapJettonVerification = (value: string): ChainJettonVerification => {
  switch (value.toLowerCase()) {
    case "whitelist":
      return ChainJettonVerification.WHITELIST;
    case "graylist":
      return ChainJettonVerification.GRAYLIST;
    case "blacklist":
      return ChainJettonVerification.BLACKLIST;
    default:
      return ChainJettonVerification.NONE;
  }
};

/** findMany + createMany + findMany — без N upsert. */
async function resolveAddressIds(
  tx: Prisma.TransactionClient,
  addresses: TransformedAddress[]
): Promise<Map<string, string>> {
  const idByRaw = new Map<string, string>();
  if (addresses.length === 0) {
    return idByRaw;
  }

  const rawAddresses = addresses.map(a => a.raw);
  const existing = await tx.chainAddress.findMany({
    where: { rawAddress: { in: rawAddresses } },
    select: { id: true, rawAddress: true },
  });

  for (const row of existing) {
    idByRaw.set(row.rawAddress.toLowerCase(), row.id);
  }

  const missing = addresses.filter(a => !idByRaw.has(a.raw.toLowerCase()));
  if (missing.length === 0) {
    return idByRaw;
  }

  await tx.chainAddress.createMany({
    data: missing.map(addr => ({
      rawAddress: addr.raw,
      name: addr.name,
      isScam: addr.isScam,
      icon: addr.icon,
      isWallet: addr.isWallet,
    })),
    skipDuplicates: true,
  });

  const inserted = await tx.chainAddress.findMany({
    where: { rawAddress: { in: missing.map(m => m.raw) } },
    select: { id: true, rawAddress: true },
  });

  for (const row of inserted) {
    idByRaw.set(row.rawAddress.toLowerCase(), row.id);
  }

  return idByRaw;
}

/** findMany + createMany + findMany — без N upsert. */
async function resolveJettonIds(
  tx: Prisma.TransactionClient,
  jettons: TransformedJetton[]
): Promise<Map<string, string>> {
  const idByAddress = new Map<string, string>();
  if (jettons.length === 0) {
    return idByAddress;
  }

  const addresses = jettons.map(j => j.address);
  const existing = await tx.chainJetton.findMany({
    where: { address: { in: addresses } },
    select: { id: true, address: true },
  });

  for (const row of existing) {
    idByAddress.set(row.address.toLowerCase(), row.id);
  }

  const missing = jettons.filter(j => !idByAddress.has(j.address.toLowerCase()));
  if (missing.length === 0) {
    return idByAddress;
  }

  await tx.chainJetton.createMany({
    data: missing.map(jet => ({
      address: jet.address,
      name: jet.name,
      symbol: jet.symbol,
      decimals: jet.decimals,
      image: jet.image,
      verification: mapJettonVerification(jet.verification),
      score: jet.score,
    })),
    skipDuplicates: true,
  });

  const inserted = await tx.chainJetton.findMany({
    where: { address: { in: missing.map(m => m.address) } },
    select: { id: true, address: true },
  });

  for (const row of inserted) {
    idByAddress.set(row.address.toLowerCase(), row.id);
  }

  return idByAddress;
}

function getExpectedActionCount(event: AccountEvent): number {
  return event.actions.length;
}

function getExpectedActionCountFromRaw(rawData: unknown): number {
  if (!rawData || typeof rawData !== "object") {
    return 0;
  }

  const payload = rawData as RawEventPayload;
  return Array.isArray(payload.actions) ? payload.actions.length : 0;
}

function isEventComplete(actionCount: number, expectedCount: number): boolean {
  return expectedCount > 0 && actionCount >= expectedCount;
}

function buildActionCreateData(
  eventId: string,
  transformed: TransformedEvent,
  addressIdMap: Map<string, string>,
  jettonIdMap: Map<string, string>
): Prisma.ChainActionCreateManyInput[] {
  return transformed.transactions.map(action => {
    const fromId = action.fromRaw ? addressIdMap.get(action.fromRaw.toLowerCase()) : undefined;
    const toId = action.toRaw ? addressIdMap.get(action.toRaw.toLowerCase()) : undefined;
    const jettonId = action.jettonAddress ? jettonIdMap.get(action.jettonAddress.toLowerCase()) : undefined;
    const jettonInId = action.jetton2Address ? jettonIdMap.get(action.jetton2Address.toLowerCase()) : undefined;

    return {
      eventId,
      walletAddress: transformed.accountRaw,
      orderIndex: action.orderIndex,
      type: action.type,
      status: action.status,
      fromId,
      toId,
      direction: action.direction,
      amount: action.amount,
      amountIn: action.amount2,
      amountOut: action.tonOut,
      tonIn: action.tonIn,
      tonOut: action.tonOut,
      jettonId,
      jettonInId,
      metadata: serializeForJson(action.details) as never,
      displayAmount: action.displayAmount,
      displayDetails: action.description,
    };
  });
}

function collectUniqueAddresses(transformedEvents: TransformedEvent[]): TransformedAddress[] {
  const byRaw = new Map<string, TransformedAddress>();
  for (const event of transformedEvents) {
    for (const addr of event.addresses) {
      byRaw.set(addr.raw.toLowerCase(), addr);
    }
  }
  return [...byRaw.values()];
}

function collectUniqueJettons(transformedEvents: TransformedEvent[]): TransformedJetton[] {
  const byAddress = new Map<string, TransformedJetton>();
  for (const event of transformedEvents) {
    for (const jetton of event.jettons) {
      byAddress.set(jetton.address.toLowerCase(), jetton);
    }
  }
  return [...byAddress.values()];
}

interface EventSyncItem {
  source: AccountEvent;
  transformed: TransformedEvent;
}

async function bulkUpsertRawEvents(
  tx: Prisma.TransactionClient,
  normalizedWallet: string,
  items: EventSyncItem[],
  eventIdByTonEventId: Map<string, string>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const now = new Date();
  const valueRows = items.map(item => {
    const chainEventId = eventIdByTonEventId.get(item.transformed.eventId);
    if (!chainEventId) {
      throw new Error(`Missing chain event id for ${item.transformed.eventId}`);
    }

    return Prisma.sql`(
      ${randomUUID()}::uuid,
      ${item.source.eventId},
      ${normalizedWallet},
      ${JSON.stringify(serializePayload(item.source))}::jsonb,
      ${chainEventId}::uuid,
      ${now},
      ${now},
      ${null}::text
    )`;
  });

  await tx.$executeRaw`
    INSERT INTO chain_raw_event (
      id,
      ton_event_id,
      wallet_address,
      payload,
      chain_event_id,
      fetched_at,
      processed_at,
      process_error
    )
    VALUES ${Prisma.join(valueRows)}
    ON CONFLICT (ton_event_id) DO UPDATE SET
      wallet_address = EXCLUDED.wallet_address,
      payload = EXCLUDED.payload,
      chain_event_id = EXCLUDED.chain_event_id,
      fetched_at = EXCLUDED.fetched_at,
      processed_at = EXCLUDED.processed_at,
      process_error = NULL
  `;
}

/**
 * Persists up to {@link SYNC_BATCH_SIZE} events with a fixed small number of SQL round-trips:
 * resolve refs → createMany(events) → createMany(actions) → bulk upsert(raw).
 */
async function saveEventsBatch(
  items: EventSyncItem[],
  walletAddress: string,
  signal?: AbortSignal
): Promise<{ saved: number; actionsSaved: number }> {
  throwIfAborted(signal);

  if (items.length === 0) {
    return { saved: 0, actionsSaved: 0 };
  }

  const normalizedWallet = toRawTonAddress(walletAddress);
  const uniqueAddresses = collectUniqueAddresses(items.map(i => i.transformed));
  const uniqueJettons = collectUniqueJettons(items.map(i => i.transformed));

  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const addressIdMap = await resolveAddressIds(tx, uniqueAddresses);
      const jettonIdMap = await resolveJettonIds(tx, uniqueJettons);

      const eventIdByTonEventId = new Map<string, string>();
      const eventRows: Prisma.ChainEventCreateManyInput[] = items.map(({ transformed }) => {
        const id = randomUUID();
        eventIdByTonEventId.set(transformed.eventId, id);

        return {
          id,
          tonEventId: transformed.eventId,
          walletAddress: transformed.accountRaw,
          timestamp: transformed.timestamp,
          lt: transformed.lt,
          isScam: transformed.isScam,
          inProgress: transformed.inProgress,
          extra: transformed.extra,
          rawData: serializeForJson(transformed.rawData) as never,
        };
      });

      const actionRows: Prisma.ChainActionCreateManyInput[] = [];
      for (const { transformed } of items) {
        const eventId = eventIdByTonEventId.get(transformed.eventId);
        if (!eventId) {
          throw new Error(`Missing event id for ${transformed.eventId}`);
        }
        actionRows.push(...buildActionCreateData(eventId, transformed, addressIdMap, jettonIdMap));
      }

      await tx.chainEvent.createMany({ data: eventRows });

      if (actionRows.length > 0) {
        await tx.chainAction.createMany({ data: actionRows });
      }

      await bulkUpsertRawEvents(tx, normalizedWallet, items, eventIdByTonEventId);

      return { saved: eventRows.length, actionsSaved: actionRows.length };
    },
    { maxWait: 15_000, timeout: 120_000 }
  );
}

async function markRawEventError(tonEventId: string, error: unknown): Promise<void> {
  await prisma.chainRawEvent.updateMany({
    where: { tonEventId },
    data: {
      processError: error instanceof Error ? error.message : String(error),
    },
  });
}

function serializePayload(payload: unknown): Record<string, unknown> {
  return serializeForJson(payload) as Record<string, unknown>;
}

export interface ClearWalletSyncDataResult {
  eventsDeleted: number;
  rawEventsDeleted: number;
}

async function resolveWalletAddressKeysForDeletion(
  walletAddress: string
): Promise<{ normalized: string; addressKeys: string[] }> {
  const normalized = toRawTonAddress(walletAddress);

  const [eventWallets, rawWallets] = await Promise.all([
    prisma.chainEvent.groupBy({
      by: ["walletAddress"],
    }),
    prisma.chainRawEvent.groupBy({
      by: ["walletAddress"],
    }),
  ]);

  const storedAddresses = [...eventWallets.map(row => row.walletAddress), ...rawWallets.map(row => row.walletAddress)];

  const addressKeys = collectMatchingWalletAddressKeys(storedAddresses, normalized);

  if (addressKeys.length === 0) {
    throw new Error("Refusing to clear wallet data: no address keys resolved");
  }

  return { normalized, addressKeys };
}

/**
 * Removes synced events/raw payloads for one wallet only; does not touch other wallets.
 */
export async function clearWalletSyncData(walletAddress: string): Promise<ClearWalletSyncDataResult> {
  const { normalized, addressKeys } = await resolveWalletAddressKeysForDeletion(walletAddress);

  const walletScopeFilter = { walletAddress: { in: addressKeys } };

  const [eventsResult, rawResult] = await prisma.$transaction([
    prisma.chainEvent.deleteMany({ where: walletScopeFilter }),
    prisma.chainRawEvent.deleteMany({ where: walletScopeFilter }),
  ]);

  await prisma.chainSyncState.upsert({
    where: { walletAddress: normalized },
    update: {
      lastLt: null,
      lastTimestamp: null,
      lastTonEventId: null,
      status: ChainSyncStatus.IDLE,
      error: null,
      eventsSynced: 0,
      actionsSynced: 0,
      startedAt: null,
      completedAt: null,
    },
    create: {
      walletAddress: normalized,
      status: ChainSyncStatus.IDLE,
    },
  });

  return {
    eventsDeleted: eventsResult.count,
    rawEventsDeleted: rawResult.count,
  };
}

/**
 * Удаляет events без actions или с неполным набором actions.
 */
export async function repairIncompleteEvents(walletAddress: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const events = await prisma.chainEvent.findMany({
    where: { walletAddress: { in: walletVariants } },
    select: {
      id: true,
      rawData: true,
      _count: { select: { actions: true } },
    },
  });

  const incompleteIds: string[] = [];

  for (const event of events) {
    const expectedFromRaw = getExpectedActionCountFromRaw(event.rawData);
    const expected = expectedFromRaw > 0 ? expectedFromRaw : 0;

    if (event._count.actions === 0) {
      incompleteIds.push(event.id);
      continue;
    }

    if (expected > 0 && event._count.actions < expected) {
      incompleteIds.push(event.id);
    }
  }

  if (incompleteIds.length === 0) {
    return 0;
  }

  await prisma.chainEvent.deleteMany({
    where: { id: { in: incompleteIds } },
  });

  return incompleteIds.length;
}

export async function syncAccountEvent(event: AccountEvent, walletAddress: string): Promise<number> {
  const result = await syncAccountEvents([event], walletAddress);
  return result.actionsSaved;
}

async function syncAccountEventsWithSplitFallback(
  items: EventSyncItem[],
  walletAddress: string,
  signal?: AbortSignal
): Promise<Pick<SyncBatchResult, "saved" | "errors" | "actionsSaved">> {
  throwIfAborted(signal);

  try {
    const batch = await saveEventsBatch(items, walletAddress, signal);
    return { saved: batch.saved, errors: 0, actionsSaved: batch.actionsSaved };
  } catch (error) {
    if (isSyncCancelledError(error)) {
      throw error;
    }

    if (items.length === 1) {
      console.error(`Failed to sync event ${items[0].source.eventId}:`, error);
      await markRawEventError(items[0].source.eventId, error);
      return { saved: 0, errors: 1, actionsSaved: 0 };
    }

    console.error(`Batch sync failed (${items.length} events), splitting retry:`, error);
    const mid = Math.ceil(items.length / 2);
    const left = await syncAccountEventsWithSplitFallback(items.slice(0, mid), walletAddress, signal);
    const right = await syncAccountEventsWithSplitFallback(items.slice(mid), walletAddress, signal);

    return {
      saved: left.saved + right.saved,
      errors: left.errors + right.errors,
      actionsSaved: left.actionsSaved + right.actionsSaved,
    };
  }
}

export async function syncAccountEvents(
  events: AccountEvent[],
  walletAddress: string,
  signal?: AbortSignal
): Promise<SyncBatchResult> {
  throwIfAborted(signal);

  if (events.length === 0) {
    return { saved: 0, skipped: 0, repaired: 0, errors: 0, actionsSaved: 0 };
  }

  const tonEventIds = events.map(e => e.eventId);
  const existingRows = await prisma.chainEvent.findMany({
    where: { tonEventId: { in: tonEventIds } },
    select: {
      id: true,
      tonEventId: true,
      _count: { select: { actions: true } },
    },
  });
  const existingByTonId = new Map(existingRows.map(row => [row.tonEventId, row]));

  let skipped = 0;
  let repaired = 0;
  const toSync: EventSyncItem[] = [];
  const toDeleteIds: string[] = [];

  for (const event of events) {
    const existing = existingByTonId.get(event.eventId);
    const expectedCount = getExpectedActionCount(event);

    if (existing && isEventComplete(existing._count.actions, expectedCount)) {
      skipped++;
      continue;
    }

    if (existing) {
      toDeleteIds.push(existing.id);
      repaired++;
    }

    toSync.push({
      source: event,
      transformed: transformAccountEvent(event),
    });
  }

  if (toSync.length === 0) {
    return { saved: 0, skipped, repaired, errors: 0, actionsSaved: 0 };
  }

  throwIfAborted(signal);

  if (toDeleteIds.length > 0) {
    await prisma.chainEvent.deleteMany({ where: { id: { in: toDeleteIds } } });
  }

  const chunks: EventSyncItem[][] = [];
  for (let i = 0; i < toSync.length; i += SYNC_BATCH_SIZE) {
    chunks.push(toSync.slice(i, i + SYNC_BATCH_SIZE));
  }

  let saved = 0;
  let errors = 0;
  let actionsSaved = 0;

  for (const chunk of chunks) {
    throwIfAborted(signal);
    const result = await syncAccountEventsWithSplitFallback(chunk, walletAddress, signal);
    saved += result.saved;
    errors += result.errors;
    actionsSaved += result.actionsSaved;
  }

  return { saved, skipped, repaired, errors, actionsSaved };
}

export async function getWalletStats(walletAddress: string): Promise<{
  events: number;
  actions: number;
  incompleteEvents: number;
}> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const events = await prisma.chainEvent.findMany({
    where: { walletAddress: { in: walletVariants } },
    select: {
      id: true,
      rawData: true,
      _count: { select: { actions: true } },
    },
  });

  const actions = await prisma.chainAction.count({
    where: { event: { walletAddress: { in: walletVariants } } },
  });

  let incompleteEvents = 0;

  for (const event of events) {
    const expectedFromRaw = getExpectedActionCountFromRaw(event.rawData);

    if (event._count.actions === 0) {
      incompleteEvents++;
      continue;
    }

    if (expectedFromRaw > 0 && event._count.actions < expectedFromRaw) {
      incompleteEvents++;
    }
  }

  return {
    events: events.length,
    actions,
    incompleteEvents,
  };
}

export async function getEventsFromDb(walletAddress: string, limit: number = 100, offset: number = 0) {
  const normalized = toRawTonAddress(walletAddress);

  return prisma.chainEvent.findMany({
    where: { walletAddress: normalized },
    include: {
      actions: {
        include: {
          from: true,
          to: true,
          jetton: true,
          jettonIn: true,
          jettonOut: true,
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function updateSyncState(
  walletAddress: string,
  updates: {
    status?: ChainSyncStatus;
    lastLt?: string;
    lastTimestamp?: Date;
    lastTonEventId?: string;
    error?: string;
    eventsSynced?: number;
    actionsSynced?: number;
  }
) {
  const normalized = toRawTonAddress(walletAddress);

  return prisma.chainSyncState.upsert({
    where: { walletAddress: normalized },
    update: {
      ...updates,
      ...(updates.status === ChainSyncStatus.SYNCING && { startedAt: new Date() }),
      ...(updates.status === ChainSyncStatus.COMPLETED && { completedAt: new Date() }),
    },
    create: {
      walletAddress: normalized,
      ...updates,
    },
  });
}

export async function getSyncState(walletAddress: string) {
  const normalized = toRawTonAddress(walletAddress);

  return prisma.chainSyncState.findUnique({
    where: { walletAddress: normalized },
  });
}

/**
 * Minimum lt among synced events — cursor for TonAPI `before_lt` (older history).
 */
export async function getOldestSyncedLt(walletAddress: string): Promise<bigint | null> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const oldest = await prisma.chainEvent.findFirst({
    where: { walletAddress: { in: walletVariants } },
    orderBy: { lt: "asc" },
    select: { lt: true },
  });

  if (!oldest?.lt) {
    return null;
  }

  return BigInt(oldest.lt.toString());
}

/**
 * Maximum lt among synced events (newest in DB).
 */
export async function getNewestSyncedLt(walletAddress: string): Promise<bigint | null> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const newest = await prisma.chainEvent.findFirst({
    where: { walletAddress: { in: walletVariants } },
    orderBy: { lt: "desc" },
    select: { lt: true },
  });

  if (!newest?.lt) {
    return null;
  }

  return BigInt(newest.lt.toString());
}
