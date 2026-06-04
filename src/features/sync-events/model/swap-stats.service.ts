import { AccountEvent } from "@/shared/api/tonapi";
import { prisma } from "@/shared/api/prisma";
import { ChainActionStatus, ChainActionType, type Prisma } from "@/shared/api/prisma-client";
import { getWalletAddressVariants } from "@/shared/lib/ton-address";
import {
  aggregateWalletSwaps,
  buildSwapLegAmounts,
  classifySwapLeg,
  extractDexFromMetadata,
  formatJettonSwapBreakdowns,
  formatSwapAggregateSummary,
  type JettonSwapBreakdownFormatted,
  type SwapActionSnapshot,
  type SwapJettonRef,
  type WalletSwapAggregate,
} from "@/features/sync-events/lib/swap-stats.utils";
import { parseNanoton } from "@/features/sync-events/lib/ton-amount.utils";
import { buildSwapPnlSummary, type SwapPnlSummary } from "@/features/sync-events/lib/swap-pnl.utils";
import { parseJettonSwapFromRawEvent } from "@/features/sync-events/lib/swap-raw-parser";
import { transformAccountEvent } from "@/features/sync-events/model/transformer";

export interface WalletSwapStatsResult {
  aggregate: WalletSwapAggregate;
  formatted: ReturnType<typeof formatSwapAggregateSummary>;
  pnl: SwapPnlSummary;
  byJetton: JettonSwapBreakdownFormatted[];
  swaps: SwapActionSnapshot[];
}

function mapJettonRef(
  row: { address: string; symbol: string; name: string; decimals: number } | null
): SwapJettonRef | null {
  if (!row) {
    return null;
  }

  return {
    address: row.address,
    symbol: row.symbol,
    name: row.name,
    decimals: row.decimals,
  };
}

function pickRawFirst(rawValue: string | null | undefined, dbValue: string | null | undefined): string | null {
  if (rawValue && parseNanoton(rawValue) > 0n) {
    return rawValue;
  }

  if (dbValue && parseNanoton(dbValue) > 0n) {
    return dbValue;
  }

  return rawValue ?? dbValue ?? null;
}

type SwapActionRow = Prisma.ChainActionGetPayload<{
  include: {
    event: { select: { tonEventId: true; timestamp: true } };
    jettonIn: { select: { address: true; symbol: true; name: true; decimals: true } };
    jettonOut: { select: { address: true; symbol: true; name: true; decimals: true } };
  };
}>;

function actionNeedsRawEnrichment(row: SwapActionRow): boolean {
  const hasSingleJettonSide = Boolean(row.jettonInId) !== Boolean(row.jettonOutId);
  const missingAmounts = row.amountIn === null || row.amountOut === null;
  return hasSingleJettonSide || missingAmounts;
}

function mapSwapRowToSnapshot(row: SwapActionRow, eventRawData: unknown | null): SwapActionSnapshot {
  const parsed = eventRawData !== null ? parseJettonSwapFromRawEvent(eventRawData, row.orderIndex) : null;

  // Prefer TON API raw payload over DB — legacy rows may have wrong jettonIn/Out FKs.
  const jettonIn = parsed?.jettonIn ?? mapJettonRef(row.jettonIn) ?? null;
  const jettonOut = parsed?.jettonOut ?? mapJettonRef(row.jettonOut) ?? null;
  const tonIn = pickRawFirst(parsed?.tonIn, row.tonIn?.toString());
  const tonOut = pickRawFirst(parsed?.tonOut, row.tonOut?.toString());
  const amountIn = pickRawFirst(parsed?.amountIn, row.amountIn?.toString());
  const amountOut = pickRawFirst(parsed?.amountOut, row.amountOut?.toString());

  const legs = buildSwapLegAmounts({
    tonIn,
    tonOut,
    jettonInSymbol: jettonIn?.symbol ?? null,
    jettonOutSymbol: jettonOut?.symbol ?? null,
  });

  return {
    id: row.id,
    eventId: row.eventId,
    tonEventId: row.event.tonEventId,
    timestamp: row.event.timestamp,
    tonIn,
    tonOut,
    amountIn,
    amountOut,
    displayAmount: row.displayAmount,
    dex: extractDexFromMetadata(row.metadata),
    jettonInSymbol: jettonIn?.symbol ?? null,
    jettonOutSymbol: jettonOut?.symbol ?? null,
    jettonIn,
    jettonOut,
    legKind: classifySwapLeg(legs),
  };
}

async function loadEventRawDataById(eventIds: string[]): Promise<Map<string, unknown>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const events = await prisma.chainEvent.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, rawData: true },
  });

  return new Map(events.map(event => [event.id, event.rawData]));
}

/**
 * Loads all JETTON_SWAP actions for a wallet and aggregates TON in/out.
 * Fetches heavy `rawData` only for rows that need legacy-field enrichment.
 */
export async function getWalletSwapStats(walletAddress: string): Promise<WalletSwapStatsResult> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const rows = await prisma.chainAction.findMany({
    where: {
      walletAddress: { in: walletVariants },
      type: ChainActionType.JETTON_SWAP,
      status: ChainActionStatus.SUCCESS,
    },
    include: {
      event: {
        select: {
          tonEventId: true,
          timestamp: true,
        },
      },
      jettonIn: {
        select: { address: true, symbol: true, name: true, decimals: true },
      },
      jettonOut: {
        select: { address: true, symbol: true, name: true, decimals: true },
      },
    },
    orderBy: {
      event: { timestamp: "desc" },
    },
  });

  const eventIdsForRaw = [...new Set(rows.filter(actionNeedsRawEnrichment).map(row => row.eventId))];
  const rawByEventId = await loadEventRawDataById(eventIdsForRaw);

  const swaps = rows.map(row => mapSwapRowToSnapshot(row, rawByEventId.get(row.eventId) ?? null));
  const aggregate = aggregateWalletSwaps(swaps);
  const pnl = buildSwapPnlSummary(aggregate, swaps);

  return {
    aggregate,
    formatted: formatSwapAggregateSummary(aggregate),
    pnl,
    byJetton: formatJettonSwapBreakdowns(aggregate.byJetton),
    swaps,
  };
}

/**
 * Re-applies JettonSwap field mapping from stored event rawData (fixes legacy rows).
 */
export async function repairJettonSwapActionFields(walletAddress: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const swapActions = await prisma.chainAction.findMany({
    where: {
      walletAddress: { in: walletVariants },
      type: ChainActionType.JETTON_SWAP,
    },
    include: {
      event: {
        select: {
          rawData: true,
        },
      },
    },
  });

  let repaired = 0;

  for (const action of swapActions) {
    const rawData = action.event.rawData;
    if (!rawData || typeof rawData !== "object") {
      continue;
    }

    const transformed = transformAccountEvent(rawData as unknown as AccountEvent);
    const tx = transformed.transactions[action.orderIndex];

    if (!tx || tx.type !== ChainActionType.JETTON_SWAP) {
      continue;
    }

    const jettonRows = await prisma.chainJetton.findMany({
      where: {
        address: {
          in: [tx.jettonAddress, tx.jetton2Address].filter((address): address is string => Boolean(address)),
        },
      },
      select: { id: true, address: true },
    });

    const jettonIdByAddress = new Map(jettonRows.map(row => [row.address.toLowerCase(), row.id]));

    const jettonInId = tx.jettonAddress ? jettonIdByAddress.get(tx.jettonAddress.toLowerCase()) : undefined;
    const jettonOutId = tx.jetton2Address ? jettonIdByAddress.get(tx.jetton2Address.toLowerCase()) : undefined;

    await prisma.chainAction.update({
      where: { id: action.id },
      data: {
        amount: tx.amount,
        amountIn: tx.amount,
        amountOut: tx.amount2,
        tonIn: tx.tonIn,
        tonOut: tx.tonOut,
        jettonId: jettonInId ?? jettonOutId,
        jettonInId,
        jettonOutId,
        displayAmount: tx.displayAmount,
        displayDetails: tx.description,
        metadata: tx.details as Prisma.InputJsonValue,
      },
    });

    repaired++;
  }

  return repaired;
}
