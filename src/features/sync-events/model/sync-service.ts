import { AccountEvent } from "@ton-api/client";
import { prisma } from "@/shared/api/prisma";
import {
  normalizeWalletAddress,
  getWalletAddressVariants,
} from "@/shared/lib/ton-address";
import { serializeForJson } from "@/shared/lib/serialize-json";
import { transformAccountEvent, TransformedEvent } from "./transformer";

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

// Сохранение адресов (upsert)
async function saveAddresses(
  addresses: {
    raw: string;
    name?: string;
    isScam: boolean;
    icon?: string;
    isWallet: boolean;
  }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const addr of addresses) {
    const upserted = await prisma.chainAddress.upsert({
      where: { rawAddress: addr.raw },
      update: {
        name: addr.name ?? undefined,
        isScam: addr.isScam,
        icon: addr.icon ?? undefined,
        isWallet: addr.isWallet,
      },
      create: {
        rawAddress: addr.raw,
        name: addr.name,
        isScam: addr.isScam,
        icon: addr.icon,
        isWallet: addr.isWallet,
      },
    });
    results.set(addr.raw.toLowerCase(), upserted.id);
  }

  return results;
}

// Сохранение жетонов (upsert)
async function saveJettons(
  jettons: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
    verification: string;
    score: number;
  }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const jet of jettons) {
    const upserted = await prisma.chainJetton.upsert({
      where: { address: jet.address },
      update: {
        name: jet.name,
        symbol: jet.symbol,
        decimals: jet.decimals,
        image: jet.image,
        verification: jet.verification,
        score: jet.score,
      },
      create: {
        address: jet.address,
        name: jet.name,
        symbol: jet.symbol,
        decimals: jet.decimals,
        image: jet.image,
        verification: jet.verification,
        score: jet.score,
      },
    });
    results.set(jet.address.toLowerCase(), upserted.id);
  }

  return results;
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

// Сохранение одного события с действиями (атомарно)
async function saveEvent(
  transformed: TransformedEvent,
  addressIdMap: Map<string, string>,
  jettonIdMap: Map<string, string>
): Promise<{ eventId: string; actionsCount: number }> {
  return prisma.$transaction(async (tx) => {
    const event = await tx.chainEvent.create({
      data: {
        tonEventId: transformed.eventId,
        walletAddress: transformed.accountRaw,
        timestamp: transformed.timestamp,
        lt: transformed.lt,
        isScam: transformed.isScam,
        inProgress: transformed.inProgress,
        extra: transformed.extra,
        rawData: serializeForJson(transformed.rawData) as never,
      },
    });

    for (const action of transformed.transactions) {
      const fromId = action.fromRaw
        ? addressIdMap.get(action.fromRaw.toLowerCase())
        : undefined;
      const toId = action.toRaw
        ? addressIdMap.get(action.toRaw.toLowerCase())
        : undefined;

      const jettonId = action.jettonAddress
        ? jettonIdMap.get(action.jettonAddress.toLowerCase())
        : undefined;
      const jettonInId = action.jetton2Address
        ? jettonIdMap.get(action.jetton2Address.toLowerCase())
        : undefined;

      await tx.chainAction.create({
        data: {
          eventId: event.id,
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
        },
      });
    }

    return { eventId: event.id, actionsCount: transformed.transactions.length };
  });
}

function serializePayload(payload: unknown): Record<string, unknown> {
  return serializeForJson(payload) as Record<string, unknown>;
}

async function saveRawEvent(
  walletAddress: string,
  tonEventId: string,
  payload: unknown
): Promise<void> {
  const serialized = serializePayload(payload);

  await prisma.chainRawEvent.upsert({
    where: { tonEventId },
    update: {
      payload: serialized as never,
      fetchedAt: new Date(),
      processedAt: null,
      processError: null,
    },
    create: {
      tonEventId,
      walletAddress,
      payload: serialized as never,
    },
  });
}

async function markRawEventProcessed(
  tonEventId: string,
  chainEventId: string,
  error?: string
): Promise<void> {
  await prisma.chainRawEvent.update({
    where: { tonEventId },
    data: {
      chainEventId,
      processedAt: new Date(),
      processError: error,
    },
  });
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

export async function syncAccountEvent(
  event: AccountEvent,
  walletAddress: string
): Promise<number> {
  const normalizedWallet = normalizeWalletAddress(walletAddress);

  await saveRawEvent(normalizedWallet, event.eventId, event);

  const transformed = transformAccountEvent(event);
  const addressIdMap = await saveAddresses(transformed.addresses);
  const jettonIdMap = await saveJettons(transformed.jettons);

  const { eventId, actionsCount } = await saveEvent(
    transformed,
    addressIdMap,
    jettonIdMap
  );

  await markRawEventProcessed(event.eventId, eventId);

  return actionsCount;
}

export async function syncAccountEvents(
  events: AccountEvent[],
  walletAddress: string
): Promise<SyncBatchResult> {
  let saved = 0;
  let skipped = 0;
  let repaired = 0;
  let errors = 0;
  let actionsSaved = 0;

  for (const event of events) {
    try {
      const existing = await prisma.chainEvent.findUnique({
        where: { tonEventId: event.eventId },
        include: { _count: { select: { actions: true } } },
      });

      const expectedCount = getExpectedActionCount(event);

      if (
        existing &&
        isEventComplete(existing._count.actions, expectedCount)
      ) {
        skipped++;
        continue;
      }

      if (existing) {
        await prisma.chainEvent.delete({ where: { id: existing.id } });
        repaired++;
      }

      const count = await syncAccountEvent(event, walletAddress);
      saved++;
      actionsSaved += count;
    } catch (error) {
      console.error(`Failed to sync event ${event.eventId}:`, error);
      errors++;

      await prisma.chainRawEvent.updateMany({
        where: { tonEventId: event.eventId },
        data: {
          processError: error instanceof Error ? error.message : String(error),
        },
      });
    }
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

export async function getEventsFromDb(
  walletAddress: string,
  limit: number = 100,
  offset: number = 0
) {
  const normalized = normalizeWalletAddress(walletAddress);

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
    status?: "idle" | "syncing" | "paused" | "error" | "completed";
    lastLt?: string;
    lastTimestamp?: Date;
    lastEventId?: string;
    error?: string;
    eventsSynced?: number;
    actionsSynced?: number;
  }
) {
  const normalized = normalizeWalletAddress(walletAddress);

  return prisma.chainSyncState.upsert({
    where: { walletAddress: normalized },
    update: {
      ...updates,
      ...(updates.status === "syncing" && { startedAt: new Date() }),
      ...(updates.status === "completed" && { completedAt: new Date() }),
    },
    create: {
      walletAddress: normalized,
      ...updates,
    },
  });
}

export async function getSyncState(walletAddress: string) {
  const normalized = normalizeWalletAddress(walletAddress);

  return prisma.chainSyncState.findUnique({
    where: { walletAddress: normalized },
  });
}

/**
 * Minimum lt among synced events — cursor for TonAPI `before_lt` (older history).
 */
export async function getOldestSyncedLt(
  walletAddress: string
): Promise<bigint | null> {
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
export async function getNewestSyncedLt(
  walletAddress: string
): Promise<bigint | null> {
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
