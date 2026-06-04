import { formatJettonFromRaw, formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import { getEffectiveTonLegs, isPtonLikeJetton } from "@/modules/swap/domain/wrapped-ton.utils";

export interface SwapJettonPrice {
  usd: number | null;
  ton: number | null;
  diff24hUsd: string | null;
}

export interface SwapJettonRef {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  image?: string | null;
  price?: SwapJettonPrice | null;
}

export type SwapLegKind = "ton_jetton" | "jetton_ton" | "jetton_jetton" | "ton_ton" | "unknown";

export interface SwapLegAmounts {
  tonInNanoton: bigint;
  tonOutNanoton: bigint;
  hasJettonIn: boolean;
  hasJettonOut: boolean;
}

export interface SwapDexBreakdown {
  dex: string;
  count: number;
  tonInNanoton: bigint;
  tonOutNanoton: bigint;
}

export interface JettonCounterpartTotal {
  jetton: SwapJettonRef;
  amountRaw: bigint;
}

export interface JettonSwapBreakdown {
  jetton: SwapJettonRef;
  /** This jetton sent into swaps (jetton in). */
  spentRaw: bigint;
  /** This jetton received from swaps (jetton out). */
  receivedRaw: bigint;
  /** TON paid when buying this jetton (TON in + this jetton out). */
  tonPaidNanoton: bigint;
  /** TON received when selling this jetton (this jetton in + TON out). */
  tonReceivedNanoton: bigint;
  counterpartsReceived: JettonCounterpartTotal[];
  counterpartsPaid: JettonCounterpartTotal[];
  legsIn: number;
  legsOut: number;
}

export interface JettonSwapBreakdownFormatted extends JettonSwapBreakdown {
  spent: string;
  received: string;
  tonPaid: string;
  tonReceived: string;
  counterpartsReceivedText: string;
  counterpartsPaidText: string;
}

export interface WalletSwapAggregate {
  swapCount: number;
  tonSpentNanoton: bigint;
  tonReceivedNanoton: bigint;
  tonNetNanoton: bigint;
  byDex: SwapDexBreakdown[];
  byJetton: JettonSwapBreakdown[];
}

export interface SwapActionSnapshot {
  id: string;
  eventId: string;
  tonEventId: string;
  timestamp: Date;
  tonIn: string | null;
  tonOut: string | null;
  amountIn: string | null;
  amountOut: string | null;
  displayAmount: string | null;
  dex: string | null;
  jettonInSymbol: string | null;
  jettonOutSymbol: string | null;
  jettonIn: SwapJettonRef | null;
  jettonOut: SwapJettonRef | null;
  legKind: SwapLegKind;
  actionType: string;
  isInferred: boolean;
  inferenceReason: string | null;
  dexFeeNanoton: string | null;
}

function getDexFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") {
    return "unknown";
  }

  const dex = (metadata as { dex?: unknown }).dex;
  return typeof dex === "string" && dex.length > 0 ? dex : "unknown";
}

function isSameJetton(a: SwapJettonRef, b: SwapJettonRef): boolean {
  return a.address.toLowerCase() === b.address.toLowerCase();
}

export function classifySwapLeg(params: SwapLegAmounts): SwapLegKind {
  const hasTonIn = params.tonInNanoton > 0n;
  const hasTonOut = params.tonOutNanoton > 0n;

  if (hasTonIn && params.hasJettonOut && !params.hasJettonIn) {
    return "ton_jetton";
  }

  if (hasTonIn && params.hasJettonIn && !params.hasJettonOut) {
    return "ton_jetton";
  }

  if (params.hasJettonIn && hasTonOut && !hasTonIn) {
    return "jetton_ton";
  }

  if (params.hasJettonIn && params.hasJettonOut) {
    return "jetton_jetton";
  }

  if (hasTonIn && hasTonOut) {
    return "ton_ton";
  }

  return "unknown";
}

export function buildSwapLegAmounts(params: {
  tonIn: string | null | undefined;
  tonOut: string | null | undefined;
  jettonInSymbol?: string | null | undefined;
  jettonOutSymbol?: string | null | undefined;
  jettonIn?: SwapJettonRef | null;
  jettonOut?: SwapJettonRef | null;
  amountIn?: string | null | undefined;
  amountOut?: string | null | undefined;
}): SwapLegAmounts {
  const jettonInIsPton = params.jettonIn ? isPtonLikeJetton(params.jettonIn) : false;
  const jettonOutIsPton = params.jettonOut ? isPtonLikeJetton(params.jettonOut) : false;

  const amountIn = parseNanoton(params.amountIn ?? null);
  const amountOut = parseNanoton(params.amountOut ?? null);

  const snapshot: SwapActionSnapshot = {
    id: "",
    eventId: "",
    tonEventId: "",
    timestamp: new Date(0),
    tonIn: params.tonIn ?? null,
    tonOut: params.tonOut ?? null,
    amountIn: params.amountIn ?? null,
    amountOut: params.amountOut ?? null,
    displayAmount: null,
    dex: null,
    jettonInSymbol: params.jettonInSymbol ?? params.jettonIn?.symbol ?? null,
    jettonOutSymbol: params.jettonOutSymbol ?? params.jettonOut?.symbol ?? null,
    jettonIn: params.jettonIn ?? null,
    jettonOut: params.jettonOut ?? null,
    legKind: "unknown",
    actionType: "",
    isInferred: false,
    inferenceReason: null,
    dexFeeNanoton: null,
  };

  const { tonInNanoton, tonOutNanoton } = getEffectiveTonLegs(snapshot);

  const hasJettonIn =
    Boolean(params.jettonInSymbol ?? params.jettonIn?.symbol) && !jettonInIsPton && amountIn > 0n;
  const hasJettonOut =
    Boolean(params.jettonOutSymbol ?? params.jettonOut?.symbol) && !jettonOutIsPton && amountOut > 0n;

  return {
    tonInNanoton,
    tonOutNanoton,
    hasJettonIn,
    hasJettonOut,
  };
}

function emptyJettonRow(jetton: SwapJettonRef): JettonSwapBreakdown {
  return {
    jetton,
    spentRaw: 0n,
    receivedRaw: 0n,
    tonPaidNanoton: 0n,
    tonReceivedNanoton: 0n,
    counterpartsReceived: [],
    counterpartsPaid: [],
    legsIn: 0,
    legsOut: 0,
  };
}

function ensureJettonRow(map: Map<string, JettonSwapBreakdown>, jetton: SwapJettonRef): JettonSwapBreakdown {
  const key = jetton.address.toLowerCase();
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const row = emptyJettonRow(jetton);
  map.set(key, row);
  return row;
}

function addCounterpart(
  list: JettonCounterpartTotal[],
  jetton: SwapJettonRef,
  amountRaw: bigint
): JettonCounterpartTotal[] {
  const key = jetton.address.toLowerCase();
  const index = list.findIndex(item => item.jetton.address.toLowerCase() === key);

  if (index === -1) {
    return [...list, { jetton, amountRaw }];
  }

  const next = [...list];
  next[index] = {
    ...next[index],
    amountRaw: next[index].amountRaw + amountRaw,
  };
  return next;
}

function formatCounterpartList(items: JettonCounterpartTotal[]): string {
  if (items.length === 0) {
    return "—";
  }

  return items.map(item => formatJettonFromRaw(item.amountRaw, item.jetton.decimals, item.jetton.symbol)).join(", ");
}

export function aggregateSwapsByJetton(swaps: SwapActionSnapshot[]): JettonSwapBreakdown[] {
  const jettonMap = new Map<string, JettonSwapBreakdown>();

  for (const swap of swaps) {
    const { tonInNanoton: tonIn, tonOutNanoton: tonOut } = getEffectiveTonLegs(swap);
    const amountIn = parseNanoton(swap.amountIn);
    const amountOut = parseNanoton(swap.amountOut);

    if (swap.jettonIn && amountIn > 0n && !isPtonLikeJetton(swap.jettonIn)) {
      const row = ensureJettonRow(jettonMap, swap.jettonIn);
      row.spentRaw += amountIn;
      row.legsIn += 1;

      if (tonOut > 0n) {
        row.tonReceivedNanoton += tonOut;
      }

      if (
        swap.jettonOut &&
        !isSameJetton(swap.jettonIn, swap.jettonOut) &&
        !isPtonLikeJetton(swap.jettonOut) &&
        amountOut > 0n
      ) {
        row.counterpartsReceived = addCounterpart(row.counterpartsReceived, swap.jettonOut, amountOut);
      }
    } else if (tonOut > 0n && swap.jettonIn && !isPtonLikeJetton(swap.jettonIn)) {
      const row = ensureJettonRow(jettonMap, swap.jettonIn);
      row.tonReceivedNanoton += tonOut;
    }

    if (swap.jettonOut && amountOut > 0n && !isPtonLikeJetton(swap.jettonOut)) {
      const row = ensureJettonRow(jettonMap, swap.jettonOut);
      row.receivedRaw += amountOut;
      row.legsOut += 1;

      if (tonIn > 0n) {
        row.tonPaidNanoton += tonIn;
      }

      if (
        swap.jettonIn &&
        !isSameJetton(swap.jettonIn, swap.jettonOut) &&
        !isPtonLikeJetton(swap.jettonIn) &&
        amountIn > 0n
      ) {
        row.counterpartsPaid = addCounterpart(row.counterpartsPaid, swap.jettonIn, amountIn);
      }
    } else if (tonIn > 0n && swap.jettonOut && !isPtonLikeJetton(swap.jettonOut)) {
      const row = ensureJettonRow(jettonMap, swap.jettonOut);
      row.tonPaidNanoton += tonIn;
    }
  }

  return [...jettonMap.values()].sort((a, b) => {
    const volumeA =
      a.spentRaw +
      a.receivedRaw +
      a.tonPaidNanoton +
      a.tonReceivedNanoton +
      a.counterpartsReceived.reduce((sum, item) => sum + item.amountRaw, 0n) +
      a.counterpartsPaid.reduce((sum, item) => sum + item.amountRaw, 0n);
    const volumeB =
      b.spentRaw +
      b.receivedRaw +
      b.tonPaidNanoton +
      b.tonReceivedNanoton +
      b.counterpartsReceived.reduce((sum, item) => sum + item.amountRaw, 0n) +
      b.counterpartsPaid.reduce((sum, item) => sum + item.amountRaw, 0n);

    if (volumeA !== volumeB) {
      return volumeA > volumeB ? -1 : 1;
    }

    return a.jetton.symbol.localeCompare(b.jetton.symbol);
  });
}

export function formatJettonSwapBreakdowns(rows: JettonSwapBreakdown[]): JettonSwapBreakdownFormatted[] {
  return rows.map(row => ({
    ...row,
    spent: formatJettonFromRaw(row.spentRaw, row.jetton.decimals, row.jetton.symbol),
    received: formatJettonFromRaw(row.receivedRaw, row.jetton.decimals, row.jetton.symbol),
    tonPaid: formatTonFromNanoton(row.tonPaidNanoton),
    tonReceived: formatTonFromNanoton(row.tonReceivedNanoton),
    counterpartsReceivedText: formatCounterpartList(row.counterpartsReceived),
    counterpartsPaidText: formatCounterpartList(row.counterpartsPaid),
  }));
}

export function aggregateWalletSwaps(swaps: SwapActionSnapshot[]): WalletSwapAggregate {
  let tonSpentNanoton = 0n;
  let tonReceivedNanoton = 0n;
  const dexMap = new Map<string, SwapDexBreakdown>();

  for (const swap of swaps) {
    const { tonInNanoton: tonIn, tonOutNanoton: tonOut } = getEffectiveTonLegs(swap);
    tonSpentNanoton += tonIn;
    tonReceivedNanoton += tonOut;

    const dexKey = swap.dex ?? "unknown";
    const existing = dexMap.get(dexKey) ?? {
      dex: dexKey,
      count: 0,
      tonInNanoton: 0n,
      tonOutNanoton: 0n,
    };

    dexMap.set(dexKey, {
      dex: dexKey,
      count: existing.count + 1,
      tonInNanoton: existing.tonInNanoton + tonIn,
      tonOutNanoton: existing.tonOutNanoton + tonOut,
    });
  }

  const byDex = [...dexMap.values()].sort((a, b) => b.count - a.count);
  const byJetton = aggregateSwapsByJetton(swaps);

  return {
    swapCount: swaps.length,
    tonSpentNanoton,
    tonReceivedNanoton,
    tonNetNanoton: tonReceivedNanoton - tonSpentNanoton,
    byDex,
    byJetton,
  };
}

export function formatSwapAggregateSummary(aggregate: WalletSwapAggregate): {
  spent: string;
  received: string;
  net: string;
} {
  return {
    spent: formatTonFromNanoton(aggregate.tonSpentNanoton),
    received: formatTonFromNanoton(aggregate.tonReceivedNanoton),
    net: formatTonFromNanoton(aggregate.tonNetNanoton),
  };
}

export function extractDexFromMetadata(metadata: unknown): string | null {
  const dex = getDexFromMetadata(metadata);
  return dex === "unknown" ? null : dex;
}
