import { randomUUID } from "node:crypto";
import { AccountEvent } from "@/shared/infrastructure/api/tonapi";
import {
  ChainActionType,
  ChainJettonVerification,
  ChainSyncStatus,
  Prisma,
} from "@/shared/infrastructure/api/prisma-client";
import { clearWalletPnl } from "@/modules/jetton/application/wallet-pnl.service";
import { prisma } from "@/shared/infrastructure/api/prisma";
import {
  toRawTonAddress,
  getWalletAddressVariants,
  collectMatchingWalletAddressKeys,
} from "@/shared/lib/ton/ton-address";
import { serializeForJson } from "@/shared/infrastructure/sync/serialize-json";
import { isSyncCancelledError, throwIfAborted } from "@/shared/infrastructure/sync/sync-abort";
import { transformAccountEvent, TransformedEvent, TransformedAddress, TransformedJetton } from "./transformer";
import {
  prepareAccountEventForTransform,
  accountEventNeedsTraceEnrichment,
} from "@/modules/wallet/application/trace-event-enrichment.service";

/** Matches TonAPI page size (`limit: 100`). */
export const SYNC_BATCH_SIZE = 100;

interface SyncBatchResult {
  saved: number;
  skipped: number;
  repaired: number;
  errors: number;
  actionsSaved: number;
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
  return transformAccountEvent(event).transactions.length;
}

function getExpectedActionCountFromRaw(rawData: unknown): number {
  if (!rawData || typeof rawData !== "object") {
    return 0;
  }

  return transformAccountEvent(rawData as AccountEvent).transactions.length;
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
    const jettonInId = action.jettonAddress ? jettonIdMap.get(action.jettonAddress.toLowerCase()) : undefined;
    const jettonOutId = action.jetton2Address ? jettonIdMap.get(action.jetton2Address.toLowerCase()) : undefined;
    const jettonId = jettonInId ?? jettonOutId;

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
      amountIn: action.amount,
      amountOut: action.amount2,
      tonIn: action.tonIn,
      tonOut: action.tonOut,
      jettonId,
      jettonInId,
      jettonOutId,
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

  await clearWalletPnl(normalized);

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
      historyComplete: false,
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

const DTRADE_FEE_PATTERN = /dtrade/i;

function chainActionHasDtradeFee(action: {
  type: ChainActionType;
  displayDetails: string | null;
  metadata: unknown;
}): boolean {
  if (action.type !== ChainActionType.TON_TRANSFER) {
    return false;
  }

  if (action.displayDetails && DTRADE_FEE_PATTERN.test(action.displayDetails)) {
    return true;
  }

  if (action.metadata && typeof action.metadata === "object") {
    const comment = (action.metadata as { comment?: unknown }).comment;
    return typeof comment === "string" && DTRADE_FEE_PATTERN.test(comment);
  }

  return false;
}

async function replaceEventActions(eventId: string, transformed: TransformedEvent): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.chainAction.deleteMany({ where: { eventId } });

    const addressIdMap = await resolveAddressIds(tx, transformed.addresses);
    const jettonIdMap = await resolveJettonIds(tx, transformed.jettons);
    const actionRows = buildActionCreateData(eventId, transformed, addressIdMap, jettonIdMap);

    if (actionRows.length > 0) {
      await tx.chainAction.createMany({ data: actionRows });
    }
  });
}

/** Max DTrade trace repairs per sync run — avoids long TonAPI sessions on large wallets. */
const TRACE_SWAP_REPAIR_BATCH = 80;

/**
 * Re-processes DTrade-style buys/sells stored without jetton legs / inferred swap rows.
 */
export async function repairTraceInferredSwapEvents(walletAddress: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const events = await prisma.chainEvent.findMany({
    where: {
      walletAddress: { in: walletVariants },
      actions: {
        some: { type: ChainActionType.SMART_CONTRACT_EXEC },
        none: { type: { in: [ChainActionType.JETTON_SWAP, ChainActionType.INFERRED_SWAP] } },
      },
    },
    select: {
      id: true,
      rawData: true,
      actions: {
        select: {
          type: true,
          displayDetails: true,
          metadata: true,
        },
      },
    },
    take: TRACE_SWAP_REPAIR_BATCH,
  });

  let repaired = 0;

  for (const row of events) {
    const hasDtradeFee = row.actions.some(chainActionHasDtradeFee);
    if (!hasDtradeFee || !row.rawData || typeof row.rawData !== "object") {
      continue;
    }

    const accountEvent = row.rawData as unknown as AccountEvent;
    if (!accountEventNeedsTraceEnrichment(accountEvent)) {
      continue;
    }

    const prepared = await prepareAccountEventForTransform(accountEvent);
    const transformed = transformAccountEvent(prepared);
    const hasInferredSwap = transformed.transactions.some(tx => tx.type === ChainActionType.INFERRED_SWAP);

    if (!hasInferredSwap) {
      continue;
    }

    await replaceEventActions(row.id, transformed);
    repaired += 1;
  }

  return repaired;
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
  const pendingEvents: AccountEvent[] = [];
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

    pendingEvents.push(event);
  }

  if (pendingEvents.length === 0) {
    return { saved: 0, skipped, repaired, errors: 0, actionsSaved: 0 };
  }

  throwIfAborted(signal);

  if (toDeleteIds.length > 0) {
    await prisma.chainEvent.deleteMany({ where: { id: { in: toDeleteIds } } });
  }

  const toSync: EventSyncItem[] = [];
  for (const event of pendingEvents) {
    throwIfAborted(signal);
    const prepared = await prepareAccountEventForTransform(event);
    toSync.push({
      source: prepared,
      transformed: transformAccountEvent(prepared),
    });
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

/**
 * Lightweight incomplete check — events with zero actions only (no groupBy scan).
 * Used before incremental sync to avoid heavy stats queries on remote DB.
 */
export async function countQuickIncompleteEvents(walletAddress: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  return prisma.chainEvent.count({
    where: {
      walletAddress: { in: walletVariants },
      actions: { none: {} },
    },
  });
}

export async function getWalletStats(walletAddress: string): Promise<{
  events: number;
  actions: number;
  incompleteEvents: number;
}> {
  const walletVariants = getWalletAddressVariants(walletAddress);
  const walletFilter = { walletAddress: { in: walletVariants } };

  const [events, actions, emptyActionEvents, actionGroups] = await Promise.all([
    prisma.chainEvent.count({ where: walletFilter }),
    prisma.chainAction.count({ where: walletFilter }),
    prisma.chainEvent.count({
      where: { ...walletFilter, actions: { none: {} } },
    }),
    prisma.chainAction.groupBy({
      by: ["eventId"],
      where: walletFilter,
      _count: { _all: true },
      _max: { orderIndex: true },
    }),
  ]);

  let gapIncompleteEvents = 0;

  for (const group of actionGroups) {
    const maxIndex = group._max.orderIndex;
    if (maxIndex === null) {
      continue;
    }

    const expectedAtLeast = maxIndex + 1;
    if (group._count._all < expectedAtLeast) {
      gapIncompleteEvents++;
    }
  }

  return {
    events,
    actions,
    incompleteEvents: emptyActionEvents + gapIncompleteEvents,
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
    historyComplete?: boolean;
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
