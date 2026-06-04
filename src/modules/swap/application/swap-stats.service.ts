import { AccountEvent } from "@/shared/infrastructure/api/tonapi";
import { prisma } from "@/shared/infrastructure/api/prisma";
import { ChainActionStatus, ChainActionType, type Prisma } from "@/shared/infrastructure/api/prisma-client";
import { getWalletAddressVariants } from "@/shared/lib/ton/ton-address";
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
} from "@/modules/swap/domain/swap-stats.utils";
import { mapJettonPriceRowToQuote } from "@/modules/jetton/domain/jetton-price.utils";
import { parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import {
  buildJettonPortfolioPnl,
  buildTonNativePortfolioPnl,
  buildUsdtNativePortfolioPnl,
  sumPortfolioPnl,
  type JettonPortfolioPnlLine,
  type PortfolioPnlTotals,
} from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import { buildSwapPnlSummary, type SwapPnlSummary } from "@/modules/swap/domain/swap-pnl.utils";
import { createTonUsdLookup, loadTonUsdChartPoints } from "@/modules/jetton/application/ton-usd-chart.service";
import { parseJettonSwapFromRawEvent } from "@/modules/swap/domain/swap-raw-parser";
import { extractDexFeeNanoton } from "@/modules/swap/domain/swap-fee.utils";
import {
  inferSwapsFromTransactions,
  SWAP_AGGREGATE_ACTION_TYPES,
  type UnclassifiedSwapCluster,
} from "@/modules/swap/domain/swap-inference.utils";
import {
  getStoredWalletPnlSwapCount,
  loadWalletPnlFromDb,
  recomputeWalletPnl,
} from "@/modules/jetton/application/wallet-pnl.service";
import { loadWalletTonTransferPnl } from "@/modules/jetton/application/wallet-ton-transfer-pnl.service";
import {
  computeTonPnlWithTransfers,
  patchTonPortfolioWithTransfers,
  type TonPnlWithTransfers,
  type TonTransferPnlSummary,
} from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import { transformAccountEvent } from "@/modules/wallet/application/transformer";

export interface UnclassifiedSwapClusterWithEvent extends UnclassifiedSwapCluster {
  eventId: string;
  tonEventId: string;
  timestamp: Date;
}

export interface WalletSwapStatsResult {
  aggregate: WalletSwapAggregate;
  formatted: ReturnType<typeof formatSwapAggregateSummary>;
  pnl: SwapPnlSummary;
  tonPortfolio: JettonPortfolioPnlLine | null;
  usdtPortfolio: JettonPortfolioPnlLine | null;
  portfolio: JettonPortfolioPnlLine[];
  portfolioTotals: PortfolioPnlTotals;
  byJetton: JettonSwapBreakdownFormatted[];
  swaps: SwapActionSnapshot[];
  nativeSwapCount: number;
  inferredSwapCount: number;
  flawedHeuristicCount: number;
  unclassified: UnclassifiedSwapClusterWithEvent[];
  tonTransfers: TonTransferPnlSummary;
  tonPnlWithTransfers: TonPnlWithTransfers;
}

function mapJettonRef(
  row: { address: string; symbol: string; name: string; decimals: number; image: string | null } | null
): SwapJettonRef | null {
  if (!row) {
    return null;
  }

  return {
    address: row.address,
    symbol: row.symbol,
    name: row.name,
    decimals: row.decimals,
    image: row.image,
  };
}

async function enrichJettonMetadata(breakdowns: WalletSwapAggregate["byJetton"]): Promise<void> {
  if (breakdowns.length === 0) {
    return;
  }

  const addresses = breakdowns.map(row => row.jetton.address);
  const jettons = await prisma.chainJetton.findMany({
    where: { address: { in: addresses } },
    select: {
      address: true,
      symbol: true,
      name: true,
      image: true,
      priceUsd: true,
      priceTon: true,
      diff24hUsd: true,
    },
  });

  const metaByAddress = new Map(jettons.map(jetton => [jetton.address.toLowerCase(), jetton]));

  for (const row of breakdowns) {
    const meta = metaByAddress.get(row.jetton.address.toLowerCase());
    if (!meta) {
      continue;
    }

    row.jetton = {
      ...row.jetton,
      symbol: meta.symbol,
      name: meta.name,
      image: meta.image ?? row.jetton.image ?? null,
      price: mapJettonPriceRowToQuote(meta),
    };
  }
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
    jettonIn: { select: { address: true; symbol: true; name: true; decimals: true; image: true } };
    jettonOut: { select: { address: true; symbol: true; name: true; decimals: true; image: true } };
  };
}>;

function actionNeedsRawEnrichment(row: SwapActionRow): boolean {
  const hasSingleJettonSide = Boolean(row.jettonInId) !== Boolean(row.jettonOutId);
  const missingAmounts = row.amountIn === null || row.amountOut === null;
  return hasSingleJettonSide || missingAmounts;
}

function extractInferenceReason(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const reason = (metadata as { inferenceReason?: unknown }).inferenceReason;
  return typeof reason === "string" ? reason : null;
}

function mapSwapRowToSnapshot(row: SwapActionRow, eventRawData: unknown | null): SwapActionSnapshot {
  const isInferred = row.type === ChainActionType.INFERRED_SWAP;
  const parsed =
    !isInferred && eventRawData !== null ? parseJettonSwapFromRawEvent(eventRawData, row.orderIndex) : null;

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
    jettonIn,
    jettonOut,
    amountIn,
    amountOut,
  });

  const dexFeeNanoton = extractDexFeeNanoton(row.metadata);
  const dexFeeStr = dexFeeNanoton > 0n ? dexFeeNanoton.toString() : null;

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
    actionType: row.type,
    isInferred,
    inferenceReason: extractInferenceReason(row.metadata),
    dexFeeNanoton: dexFeeStr,
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
 * Loads swap aggregate actions (native + inferred) and optional flawed heuristics for a wallet.
 * Fetches heavy `rawData` only for rows that need legacy-field enrichment.
 */
export async function getWalletSwapStats(walletAddress: string): Promise<WalletSwapStatsResult> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const rows = await prisma.chainAction.findMany({
    where: {
      walletAddress: { in: walletVariants },
      type: { in: [...SWAP_AGGREGATE_ACTION_TYPES] },
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
        select: { address: true, symbol: true, name: true, decimals: true, image: true },
      },
      jettonOut: {
        select: { address: true, symbol: true, name: true, decimals: true, image: true },
      },
    },
    orderBy: {
      event: { timestamp: "desc" },
    },
  });

  const eventIdsForRaw = [...new Set(rows.filter(actionNeedsRawEnrichment).map(row => row.eventId))];
  const rawByEventId = await loadEventRawDataById(eventIdsForRaw);

  const primarySwaps = rows.map(row => mapSwapRowToSnapshot(row, rawByEventId.get(row.eventId) ?? null));
  const flawedHeuristicSwaps = await loadFlawedHeuristicSwaps(walletVariants);
  const swaps = [...primarySwaps, ...flawedHeuristicSwaps].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const nativeSwapCount = swaps.filter(s => s.actionType === ChainActionType.JETTON_SWAP).length;
  const inferredSwapCount = swaps.filter(s => s.actionType === ChainActionType.INFERRED_SWAP).length;
  const flawedHeuristicCount = swaps.filter(s => s.actionType === "FLAWED_HEURISTIC").length;

  const unclassified = await loadUnclassifiedSwapClusters(walletVariants);
  const aggregate = aggregateWalletSwaps(swaps);
  await enrichJettonMetadata(aggregate.byJetton);

  const [storedSwapCount, currentSwapCount] = await Promise.all([
    getStoredWalletPnlSwapCount(walletAddress),
    Promise.resolve(aggregate.swapCount),
  ]);

  let pnl: SwapPnlSummary;

  if (storedSwapCount === currentSwapCount && currentSwapCount > 0) {
    const cached = await loadWalletPnlFromDb(walletAddress);
    pnl = cached ?? (await recomputeWalletPnl(walletAddress, aggregate, swaps));
  } else if (currentSwapCount === 0) {
    pnl = buildSwapPnlSummary(aggregate, swaps);
    await recomputeWalletPnl(walletAddress, aggregate, swaps);
  } else {
    pnl = await recomputeWalletPnl(walletAddress, aggregate, swaps);
  }

  const byJetton = formatJettonSwapBreakdowns(aggregate.byJetton);

  const tonUsdChart = await loadTonUsdChartPoints();
  const tonUsdLookup = createTonUsdLookup(tonUsdChart);

  const getJettonUsdAt = (jetton: SwapJettonRef, _timestampSec: number): number | null => {
    void _timestampSec;
    return jetton.price?.usd ?? null;
  };

  let tonPortfolio = buildTonNativePortfolioPnl(swaps, getJettonUsdAt);
  const usdtPortfolio = buildUsdtNativePortfolioPnl(swaps, getJettonUsdAt);
  const portfolio = buildJettonPortfolioPnl(swaps, byJetton, tonUsdLookup, getJettonUsdAt);
  const portfolioTotals = sumPortfolioPnl(portfolio);

  const tonTransfers = await loadWalletTonTransferPnl(walletAddress);
  const tonPnlWithTransfers = computeTonPnlWithTransfers(pnl.ton, tonTransfers);
  tonPortfolio = patchTonPortfolioWithTransfers(tonPortfolio, tonPnlWithTransfers, tonTransfers);

  return {
    aggregate,
    formatted: formatSwapAggregateSummary(aggregate),
    pnl,
    tonPortfolio,
    usdtPortfolio,
    portfolio,
    portfolioTotals,
    tonTransfers,
    tonPnlWithTransfers,
    byJetton,
    swaps,
    nativeSwapCount,
    inferredSwapCount,
    flawedHeuristicCount,
    unclassified,
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
      type: { in: [ChainActionType.JETTON_SWAP, ChainActionType.INFERRED_SWAP] },
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

    if (!tx || (tx.type !== ChainActionType.JETTON_SWAP && tx.type !== ChainActionType.INFERRED_SWAP)) {
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

type EventWithActionsRow = Prisma.ChainEventGetPayload<{
  select: {
    id: true;
    tonEventId: true;
    timestamp: true;
    rawData: true;
    actions: {
      select: {
        id: true;
        type: true;
        orderIndex: true;
        direction: true;
        amount: true;
        amountIn: true;
        amountOut: true;
        tonIn: true;
        tonOut: true;
        displayAmount: true;
        metadata: true;
        jettonIn: { select: { address: true; symbol: true; name: true; decimals: true; image: true } };
        jettonOut: { select: { address: true; symbol: true; name: true; decimals: true; image: true } };
        jetton: { select: { address: true; symbol: true; name: true; decimals: true; image: true } };
      };
    };
  };
}>;

async function loadEventsWithoutSwapActions(walletVariants: string[]): Promise<EventWithActionsRow[]> {
  return prisma.chainEvent.findMany({
    where: {
      walletAddress: { in: walletVariants },
      actions: {
        none: {
          type: { in: [...SWAP_AGGREGATE_ACTION_TYPES] },
        },
      },
    },
    select: {
      id: true,
      tonEventId: true,
      timestamp: true,
      rawData: true,
      actions: {
        select: {
          id: true,
          type: true,
          orderIndex: true,
          direction: true,
          amount: true,
          amountIn: true,
          amountOut: true,
          tonIn: true,
          tonOut: true,
          displayAmount: true,
          metadata: true,
          jettonIn: { select: { address: true, symbol: true, name: true, decimals: true, image: true } },
          jettonOut: { select: { address: true, symbol: true, name: true, decimals: true, image: true } },
          jetton: { select: { address: true, symbol: true, name: true, decimals: true, image: true } },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 200,
  });
}

async function loadFlawedHeuristicSwaps(walletVariants: string[]): Promise<SwapActionSnapshot[]> {
  const events = await loadEventsWithoutSwapActions(walletVariants);
  const snapshots: SwapActionSnapshot[] = [];

  for (const event of events) {
    const flawed = event.actions.find(action => action.type === ChainActionType.FLAWED_JETTON_TRANSFER);
    if (!flawed) {
      continue;
    }

    const hasTonTransfer = event.actions.some(action => action.type === ChainActionType.TON_TRANSFER);
    if (!hasTonTransfer) {
      continue;
    }

    if (!event.rawData || typeof event.rawData !== "object") {
      continue;
    }

    const transformed = transformAccountEvent(event.rawData as unknown as AccountEvent);
    const inferred = inferSwapsFromTransactions(
      transformed.transactions.filter(tx => tx.type !== ChainActionType.INFERRED_SWAP),
      transformed.accountRaw,
      new Map(transformed.jettons.map(j => [j.address.toLowerCase(), j]))
    );

    if (inferred.inferredTransactions.length > 0) {
      continue;
    }

    const jettonIn = mapJettonRef(flawed.jettonIn ?? flawed.jetton);
    const jettonOut = mapJettonRef(flawed.jettonOut);
    const amountIn = flawed.amountIn?.toString() ?? flawed.amount?.toString() ?? null;
    const amountOut = flawed.amountOut?.toString() ?? null;

    const tonIn =
      event.actions
        .filter(a => a.type === ChainActionType.TON_TRANSFER && a.direction === "OUTGOING")
        .reduce((sum, a) => sum + parseNanoton(a.amount?.toString()), 0n)
        .toString() || null;

    const tonOut =
      event.actions
        .filter(a => a.type === ChainActionType.TON_TRANSFER && a.direction === "INCOMING")
        .reduce((sum, a) => sum + parseNanoton(a.amount?.toString()), 0n)
        .toString() || null;

    const resolvedJettonIn = jettonIn ?? (amountIn && flawed.jetton ? mapJettonRef(flawed.jetton) : null);
    const resolvedJettonOut = jettonOut ?? null;

    const hasJettonLeg = Boolean(resolvedJettonIn || resolvedJettonOut);
    const hasPositiveTonAmount = parseNanoton(tonIn) > 0n || parseNanoton(tonOut) > 0n;

    if (!hasJettonLeg || !hasPositiveTonAmount) {
      continue;
    }

    const legs = buildSwapLegAmounts({
      tonIn,
      tonOut,
      jettonInSymbol: resolvedJettonIn?.symbol ?? null,
      jettonOutSymbol: resolvedJettonOut?.symbol ?? null,
      jettonIn: resolvedJettonIn,
      jettonOut: resolvedJettonOut,
      amountIn,
      amountOut,
    });

    snapshots.push({
      id: `flawed:${flawed.id}`,
      eventId: event.id,
      tonEventId: event.tonEventId,
      timestamp: event.timestamp,
      tonIn: parseNanoton(tonIn) > 0n ? tonIn : null,
      tonOut: parseNanoton(tonOut) > 0n ? tonOut : null,
      amountIn,
      amountOut,
      displayAmount: flawed.displayAmount,
      dex: extractDexFromMetadata(flawed.metadata),
      jettonInSymbol: resolvedJettonIn?.symbol ?? null,
      jettonOutSymbol: resolvedJettonOut?.symbol ?? null,
      jettonIn: resolvedJettonIn,
      jettonOut: resolvedJettonOut,
      legKind: classifySwapLeg(legs),
      actionType: "FLAWED_HEURISTIC",
      isInferred: true,
      inferenceReason: "flawed_jetton_transfer+ton_transfer",
      dexFeeNanoton: null,
    });
  }

  return snapshots;
}

async function loadUnclassifiedSwapClusters(walletVariants: string[]): Promise<UnclassifiedSwapClusterWithEvent[]> {
  const events = await loadEventsWithoutSwapActions(walletVariants);
  const clusters: UnclassifiedSwapClusterWithEvent[] = [];

  for (const event of events) {
    if (!event.rawData || typeof event.rawData !== "object") {
      continue;
    }

    const transformed = transformAccountEvent(event.rawData as unknown as AccountEvent);
    const withoutPersistedInferred = transformed.transactions.filter(tx => tx.type !== ChainActionType.INFERRED_SWAP);

    const { unclassifiedClusters } = inferSwapsFromTransactions(
      withoutPersistedInferred,
      transformed.accountRaw,
      new Map(transformed.jettons.map(j => [j.address.toLowerCase(), j]))
    );

    for (const cluster of unclassifiedClusters) {
      clusters.push({
        ...cluster,
        eventId: event.id,
        tonEventId: event.tonEventId,
        timestamp: event.timestamp,
      });
    }
  }

  return clusters;
}
