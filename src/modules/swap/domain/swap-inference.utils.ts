import { ChainActionDirection, ChainActionStatus, ChainActionType } from "@/shared/infrastructure/api/prisma-client";
import type { TransformedJetton, TransformedTransaction } from "@/modules/wallet/application/transformer";
import { formatJettonFromRaw, formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import { hasLendingProtocolMarker } from "@/modules/swap/domain/lending-protocol.utils";

/** Base order index for synthetic inferred swap rows (avoids collision with TonAPI action indices). */
export const INFERRED_SWAP_ORDER_BASE = 10_000;

const DTRADE_FEE_PATTERN = /dtrade/i;
const DEDUST_PATTERN = /dedust/i;
const SWAP_OP_PATTERN = /0xcbc33949/i;

export const SWAP_AGGREGATE_ACTION_TYPES = [
  ChainActionType.JETTON_SWAP,
  ChainActionType.INFERRED_SWAP,
] as const;

export type SwapAggregateActionType = (typeof SWAP_AGGREGATE_ACTION_TYPES)[number];

export interface SwapInferenceDetails {
  dex: string;
  inferred: true;
  inferenceReason: string;
  confidence: "high" | "medium" | "low";
  sourceOrderIndices: number[];
  feeTonNanoton?: string;
}

export interface UnclassifiedSwapCluster {
  sourceOrderIndices: number[];
  reason: string;
  hint: string;
  jettonOutSymbol: string | null;
  jettonInSymbol: string | null;
  tonInNanoton: bigint;
  tonOutNanoton: bigint;
}

export interface SwapInferenceResult {
  inferredTransactions: TransformedTransaction[];
  unclassifiedClusters: UnclassifiedSwapCluster[];
}

interface JettonLeg {
  orderIndex: number;
  address: string;
  amountRaw: string;
  symbol: string;
  decimals: number;
  direction: "out" | "in";
}

function getComment(tx: TransformedTransaction): string {
  const comment = tx.details.comment;
  return typeof comment === "string" ? comment : "";
}

function getDescription(tx: TransformedTransaction): string {
  return tx.description ?? "";
}

function isDexFeeTransfer(tx: TransformedTransaction): boolean {
  if (tx.type !== ChainActionType.TON_TRANSFER || tx.direction !== ChainActionDirection.OUTGOING) {
    return false;
  }

  const comment = getComment(tx);
  return DTRADE_FEE_PATTERN.test(comment) || (DEDUST_PATTERN.test(comment) && comment.length > 0);
}

function hasSwapOpHint(tx: TransformedTransaction): boolean {
  return SWAP_OP_PATTERN.test(getDescription(tx));
}

function resolveDex(feeTransfers: TransformedTransaction[], transactions: TransformedTransaction[]): string {
  for (const tx of feeTransfers) {
    const comment = getComment(tx);
    if (DTRADE_FEE_PATTERN.test(comment) && DEDUST_PATTERN.test(comment)) {
      return "dtrade/dedust";
    }
    if (DTRADE_FEE_PATTERN.test(comment)) {
      return "dtrade";
    }
    if (DEDUST_PATTERN.test(comment)) {
      return "dedust";
    }
  }

  if (transactions.some(hasSwapOpHint)) {
    return "dedust";
  }

  return "unknown";
}

function resolveConfidence(
  reason: string,
  feeTransfers: TransformedTransaction[],
  transactions: TransformedTransaction[]
): "high" | "medium" | "low" {
  if (feeTransfers.length > 0 || transactions.some(hasSwapOpHint)) {
    return "high";
  }

  if (reason.includes("flawed")) {
    return "medium";
  }

  return "medium";
}

function getJettonMeta(
  jettonsByAddress: Map<string, TransformedJetton>,
  address: string | undefined
): TransformedJetton | undefined {
  if (!address) {
    return undefined;
  }

  return jettonsByAddress.get(address.toLowerCase());
}

function collectJettonLegs(
  transactions: TransformedTransaction[],
  jettonsByAddress: Map<string, TransformedJetton>,
  consumed: Set<number>
): JettonLeg[] {
  const legs: JettonLeg[] = [];

  for (const tx of transactions) {
    if (consumed.has(tx.orderIndex)) {
      continue;
    }

    if (tx.type === ChainActionType.JETTON_TRANSFER && tx.jettonAddress && tx.amount) {
      const meta = getJettonMeta(jettonsByAddress, tx.jettonAddress);
      if (!meta) {
        continue;
      }

      if (tx.direction === ChainActionDirection.OUTGOING) {
        legs.push({
          orderIndex: tx.orderIndex,
          address: meta.address,
          amountRaw: tx.amount,
          symbol: meta.symbol,
          decimals: meta.decimals,
          direction: "out",
        });
      } else if (tx.direction === ChainActionDirection.INCOMING) {
        legs.push({
          orderIndex: tx.orderIndex,
          address: meta.address,
          amountRaw: tx.amount,
          symbol: meta.symbol,
          decimals: meta.decimals,
          direction: "in",
        });
      }
    }

    if (
      tx.type === ChainActionType.JETTON_MINT &&
      tx.jettonAddress &&
      tx.amount &&
      tx.direction === ChainActionDirection.INCOMING
    ) {
      const meta = getJettonMeta(jettonsByAddress, tx.jettonAddress);
      if (!meta) {
        continue;
      }

      legs.push({
        orderIndex: tx.orderIndex,
        address: meta.address,
        amountRaw: tx.amount,
        symbol: meta.symbol,
        decimals: meta.decimals,
        direction: "in",
      });
    }

    if (tx.type === ChainActionType.FLAWED_JETTON_TRANSFER && tx.jettonAddress) {
      const meta = getJettonMeta(jettonsByAddress, tx.jettonAddress);
      if (!meta) {
        continue;
      }

      const sentRaw = tx.amount ?? tx.details.sentAmount;
      const receivedRaw = tx.amount2 ?? tx.details.receivedAmount;

      if (typeof sentRaw === "string" && parseNanoton(sentRaw) > 0n) {
        legs.push({
          orderIndex: tx.orderIndex,
          address: meta.address,
          amountRaw: sentRaw,
          symbol: meta.symbol,
          decimals: meta.decimals,
          direction: "out",
        });
      }

      if (typeof receivedRaw === "string" && parseNanoton(receivedRaw) > 0n) {
        legs.push({
          orderIndex: tx.orderIndex,
          address: meta.address,
          amountRaw: receivedRaw,
          symbol: meta.symbol,
          decimals: meta.decimals,
          direction: "in",
        });
      }
    }
  }

  return legs;
}

function isWalletTonPayment(tx: TransformedTransaction, accountRaw: string): boolean {
  if (!tx.amount || parseNanoton(tx.amount) <= 0n) {
    return false;
  }

  if (tx.type === ChainActionType.SMART_CONTRACT_EXEC) {
    return tx.fromRaw === accountRaw;
  }

  return tx.type === ChainActionType.TON_TRANSFER && tx.direction === ChainActionDirection.OUTGOING && !isDexFeeTransfer(tx);
}

function sumTonAmounts(
  transactions: TransformedTransaction[],
  consumed: Set<number>,
  direction: ChainActionDirection,
  accountRaw?: string
): bigint {
  let total = 0n;

  for (const tx of transactions) {
    if (consumed.has(tx.orderIndex)) {
      continue;
    }

    if (direction === ChainActionDirection.OUTGOING && accountRaw && isWalletTonPayment(tx, accountRaw)) {
      total += parseNanoton(tx.amount);
      continue;
    }

    if (tx.type !== ChainActionType.TON_TRANSFER || tx.direction !== direction || !tx.amount) {
      continue;
    }

    if (direction === ChainActionDirection.OUTGOING && isDexFeeTransfer(tx)) {
      continue;
    }

    total += parseNanoton(tx.amount);
  }

  return total;
}

/** DTrade sells often return main proceeds + small excess/refund TON in one event — use the largest leg. */
function maxTonTransferAmount(
  transactions: TransformedTransaction[],
  consumed: Set<number>,
  direction: ChainActionDirection
): bigint {
  let max = 0n;

  for (const tx of transactions) {
    if (consumed.has(tx.orderIndex)) {
      continue;
    }

    if (tx.type !== ChainActionType.TON_TRANSFER || tx.direction !== direction || !tx.amount) {
      continue;
    }

    if (direction === ChainActionDirection.OUTGOING && isDexFeeTransfer(tx)) {
      continue;
    }

    const amount = parseNanoton(tx.amount);
    if (amount > max) {
      max = amount;
    }
  }

  return max;
}

function collectFeeTon(transactions: TransformedTransaction[], consumed: Set<number>): bigint {
  let total = 0n;

  for (const tx of transactions) {
    if (consumed.has(tx.orderIndex)) {
      continue;
    }

    if (isDexFeeTransfer(tx) && tx.amount) {
      total += parseNanoton(tx.amount);
    }
  }

  return total;
}

function collectSourceIndices(...groups: TransformedTransaction[][]): number[] {
  const indices = new Set<number>();

  for (const group of groups) {
    for (const tx of group) {
      indices.add(tx.orderIndex);
    }
  }

  return [...indices].sort((a, b) => a - b);
}

function buildInferredSwapTransaction(params: {
  inferenceIndex: number;
  accountRaw: string;
  jettonInAddress?: string;
  jettonOutAddress?: string;
  amountIn?: string;
  amountOut?: string;
  tonIn?: string;
  tonOut?: string;
  displayAmount: string;
  description: string;
  details: SwapInferenceDetails;
}): TransformedTransaction {
  return {
    orderIndex: INFERRED_SWAP_ORDER_BASE + params.inferenceIndex,
    type: ChainActionType.INFERRED_SWAP,
    status: ChainActionStatus.SUCCESS,
    fromRaw: params.accountRaw,
    direction: ChainActionDirection.SELF,
    jettonAddress: params.jettonInAddress,
    jetton2Address: params.jettonOutAddress,
    amount: params.amountIn,
    amount2: params.amountOut,
    tonIn: params.tonIn,
    tonOut: params.tonOut,
    displayAmount: params.displayAmount,
    description: params.description,
    details: { ...params.details },
  };
}

function markConsumedFromLegs(consumed: Set<number>, legs: JettonLeg[]): void {
  for (const leg of legs) {
    consumed.add(leg.orderIndex);
  }
}

function markTonLegsConsumed(
  transactions: TransformedTransaction[],
  consumed: Set<number>,
  direction: ChainActionDirection,
  includeFees: boolean,
  accountRaw?: string
): TransformedTransaction[] {
  const matched: TransformedTransaction[] = [];

  for (const tx of transactions) {
    if (consumed.has(tx.orderIndex)) {
      continue;
    }

    if (direction === ChainActionDirection.OUTGOING && accountRaw && isWalletTonPayment(tx, accountRaw)) {
      consumed.add(tx.orderIndex);
      matched.push(tx);
      continue;
    }

    if (tx.type !== ChainActionType.TON_TRANSFER || tx.direction !== direction) {
      continue;
    }

    if (direction === ChainActionDirection.OUTGOING && isDexFeeTransfer(tx)) {
      if (includeFees) {
        consumed.add(tx.orderIndex);
        matched.push(tx);
      }
      continue;
    }

    consumed.add(tx.orderIndex);
    matched.push(tx);
  }

  return matched;
}

function tryInferJettonToTon(params: {
  transactions: TransformedTransaction[];
  jettonsByAddress: Map<string, TransformedJetton>;
  consumed: Set<number>;
  accountRaw: string;
  inferenceIndex: number;
}): TransformedTransaction | null {
  const jettonOuts = collectJettonLegs(params.transactions, params.jettonsByAddress, params.consumed).filter(
    leg => leg.direction === "out"
  );

  if (jettonOuts.length !== 1) {
    return null;
  }

  const tonInTotal = maxTonTransferAmount(params.transactions, params.consumed, ChainActionDirection.INCOMING);
  if (tonInTotal <= 0n) {
    return null;
  }

  const jettonOut = jettonOuts[0];
  markConsumedFromLegs(params.consumed, [jettonOut]);

  const tonIns = markTonLegsConsumed(params.transactions, params.consumed, ChainActionDirection.INCOMING, false);
  const feeTransfers = params.transactions.filter(tx => isDexFeeTransfer(tx) && !params.consumed.has(tx.orderIndex));
  const feeTon = collectFeeTon(params.transactions, new Set());
  for (const feeTx of feeTransfers) {
    params.consumed.add(feeTx.orderIndex);
  }

  const sourceOrderIndices = collectSourceIndices(
    params.transactions.filter(tx => tx.orderIndex === jettonOut.orderIndex),
    tonIns,
    feeTransfers
  );

  const reason = feeTransfers.length > 0 ? "jetton_out+ton_in+dtrade_fee" : "jetton_out+ton_in";
  const dex = resolveDex(feeTransfers, params.transactions);
  const confidence = resolveConfidence(reason, feeTransfers, params.transactions);

  const displayAmount = `-${formatJettonFromRaw(jettonOut.amountRaw, jettonOut.decimals, jettonOut.symbol)} → +${formatTonFromNanoton(tonInTotal)}`;

  return buildInferredSwapTransaction({
    inferenceIndex: params.inferenceIndex,
    accountRaw: params.accountRaw,
    jettonInAddress: jettonOut.address,
    amountIn: jettonOut.amountRaw,
    tonOut: tonInTotal.toString(),
    displayAmount,
    description: `Inferred swap (${reason}) · ${dex}`,
    details: {
      dex,
      inferred: true,
      inferenceReason: reason,
      confidence,
      sourceOrderIndices,
      feeTonNanoton: feeTon > 0n ? feeTon.toString() : undefined,
    },
  });
}

function tryInferTonToJetton(params: {
  transactions: TransformedTransaction[];
  jettonsByAddress: Map<string, TransformedJetton>;
  consumed: Set<number>;
  accountRaw: string;
  inferenceIndex: number;
}): TransformedTransaction | null {
  const jettonIns = collectJettonLegs(params.transactions, params.jettonsByAddress, params.consumed).filter(
    leg => leg.direction === "in"
  );

  if (jettonIns.length !== 1) {
    return null;
  }

  const tonOutGross = sumTonAmounts(
    params.transactions,
    params.consumed,
    ChainActionDirection.OUTGOING,
    params.accountRaw
  );
  const tonRefund = sumTonAmounts(params.transactions, params.consumed, ChainActionDirection.INCOMING);
  const tonOutTotal = tonOutGross > tonRefund ? tonOutGross - tonRefund : tonOutGross;
  if (tonOutTotal <= 0n) {
    return null;
  }

  const jettonIn = jettonIns[0];
  markConsumedFromLegs(params.consumed, [jettonIn]);

  const tonOuts = markTonLegsConsumed(
    params.transactions,
    params.consumed,
    ChainActionDirection.OUTGOING,
    false,
    params.accountRaw
  );
  if (tonRefund > 0n) {
    markTonLegsConsumed(params.transactions, params.consumed, ChainActionDirection.INCOMING, false);
  }
  const feeTransfers = params.transactions.filter(tx => isDexFeeTransfer(tx) && !params.consumed.has(tx.orderIndex));
  const feeTon = collectFeeTon(params.transactions, new Set());
  for (const feeTx of feeTransfers) {
    params.consumed.add(feeTx.orderIndex);
  }

  const sourceOrderIndices = collectSourceIndices(
    params.transactions.filter(tx => tx.orderIndex === jettonIn.orderIndex),
    tonOuts,
    feeTransfers
  );

  const reason = feeTransfers.length > 0 ? "ton_out+jetton_in+dtrade_fee" : "ton_out+jetton_in";
  const dex = resolveDex(feeTransfers, params.transactions);
  const confidence = resolveConfidence(reason, feeTransfers, params.transactions);

  const displayAmount = `-${formatTonFromNanoton(tonOutTotal)} → +${formatJettonFromRaw(jettonIn.amountRaw, jettonIn.decimals, jettonIn.symbol)}`;

  return buildInferredSwapTransaction({
    inferenceIndex: params.inferenceIndex,
    accountRaw: params.accountRaw,
    jettonOutAddress: jettonIn.address,
    amountOut: jettonIn.amountRaw,
    tonIn: tonOutTotal.toString(),
    displayAmount,
    description: `Inferred swap (${reason}) · ${dex}`,
    details: {
      dex,
      inferred: true,
      inferenceReason: reason,
      confidence,
      sourceOrderIndices,
      feeTonNanoton: feeTon > 0n ? feeTon.toString() : undefined,
    },
  });
}

function tryInferJettonToJetton(params: {
  transactions: TransformedTransaction[];
  jettonsByAddress: Map<string, TransformedJetton>;
  consumed: Set<number>;
  accountRaw: string;
  inferenceIndex: number;
}): TransformedTransaction | null {
  const legs = collectJettonLegs(params.transactions, params.jettonsByAddress, params.consumed);
  const jettonOuts = legs.filter(leg => leg.direction === "out");
  const jettonIns = legs.filter(leg => leg.direction === "in");

  if (jettonOuts.length !== 1 || jettonIns.length !== 1) {
    return null;
  }

  const jettonOut = jettonOuts[0];
  const jettonIn = jettonIns[0];

  if (jettonOut.address.toLowerCase() === jettonIn.address.toLowerCase()) {
    return null;
  }

  const tonInTotal = sumTonAmounts(params.transactions, params.consumed, ChainActionDirection.INCOMING);
  const tonOutTotal = sumTonAmounts(params.transactions, params.consumed, ChainActionDirection.OUTGOING);

  if (tonInTotal > 0n || tonOutTotal > 0n) {
    return null;
  }

  markConsumedFromLegs(params.consumed, [jettonOut, jettonIn]);

  const feeTransfers = params.transactions.filter(tx => isDexFeeTransfer(tx) && !params.consumed.has(tx.orderIndex));
  for (const feeTx of feeTransfers) {
    params.consumed.add(feeTx.orderIndex);
  }

  const sourceOrderIndices = collectSourceIndices(
    params.transactions.filter(tx => tx.orderIndex === jettonOut.orderIndex || tx.orderIndex === jettonIn.orderIndex),
    feeTransfers
  );

  const dex = resolveDex(feeTransfers, params.transactions);
  const reason = "jetton_out+jetton_in";
  const confidence = resolveConfidence(reason, feeTransfers, params.transactions);

  const displayAmount = `-${formatJettonFromRaw(jettonOut.amountRaw, jettonOut.decimals, jettonOut.symbol)} → +${formatJettonFromRaw(jettonIn.amountRaw, jettonIn.decimals, jettonIn.symbol)}`;

  return buildInferredSwapTransaction({
    inferenceIndex: params.inferenceIndex,
    accountRaw: params.accountRaw,
    jettonInAddress: jettonOut.address,
    jettonOutAddress: jettonIn.address,
    amountIn: jettonOut.amountRaw,
    amountOut: jettonIn.amountRaw,
    displayAmount,
    description: `Inferred swap (${reason}) · ${dex}`,
    details: {
      dex,
      inferred: true,
      inferenceReason: reason,
      confidence,
      sourceOrderIndices,
    },
  });
}

function detectUnclassifiedCluster(
  transactions: TransformedTransaction[],
  jettonsByAddress: Map<string, TransformedJetton>,
  consumed: Set<number>
): UnclassifiedSwapCluster | null {
  const legs = collectJettonLegs(transactions, jettonsByAddress, consumed);
  const jettonOuts = legs.filter(leg => leg.direction === "out");
  const jettonIns = legs.filter(leg => leg.direction === "in");

  const tonIn = sumTonAmounts(transactions, consumed, ChainActionDirection.INCOMING);
  const tonOut = sumTonAmounts(transactions, consumed, ChainActionDirection.OUTGOING);
  const hasFeeHint = transactions.some(tx => isDexFeeTransfer(tx) || hasSwapOpHint(tx));

  const hasJettonOut = jettonOuts.length > 0;
  const hasJettonIn = jettonIns.length > 0;
  const hasTonIn = tonIn > 0n;
  const hasTonOut = tonOut > 0n;

  const isComplete =
    (hasJettonOut && hasTonIn && !hasJettonIn) ||
    (hasJettonIn && hasTonOut && !hasJettonOut) ||
    (hasJettonOut && hasJettonIn && jettonOuts.length === 1 && jettonIns.length === 1);

  const isSwapLike = hasFeeHint || (hasJettonOut && (hasTonIn || hasJettonIn)) || (hasJettonIn && hasTonOut);

  if (!isSwapLike || isComplete) {
    return null;
  }

  const sourceOrderIndices = transactions
    .filter(tx => !consumed.has(tx.orderIndex))
    .map(tx => tx.orderIndex)
    .sort((a, b) => a - b);

  let reason = "partial_swap_pattern";
  let hint = "Transfer cluster looks swap-like but could not be inferred.";

  if (hasJettonOut && !hasTonIn && !hasJettonIn) {
    reason = "jetton_out_without_counterpart";
    hint = "Outgoing jetton without matching TON/jetton in the same event.";
  } else if (hasJettonIn && !hasTonOut && !hasJettonOut) {
    reason = "jetton_in_without_counterpart";
    hint = "Incoming jetton without matching TON/jetton out in the same event.";
  } else if (jettonOuts.length > 1 || jettonIns.length > 1) {
    reason = "multi_leg_ambiguous";
    hint = "Multiple jetton legs in one event — manual review needed.";
  }

  return {
    sourceOrderIndices,
    reason,
    hint,
    jettonOutSymbol: jettonOuts[0]?.symbol ?? null,
    jettonInSymbol: jettonIns[0]?.symbol ?? null,
    tonInNanoton: tonIn,
    tonOutNanoton: tonOut,
  };
}

/**
 * Detects DTrade/DeDust-style swaps from transfer actions within a single event.
 * Skips inference when TonAPI already returned `JettonSwap`.
 */
export function inferSwapsFromTransactions(
  transactions: TransformedTransaction[],
  accountRaw: string,
  jettonsByAddress: Map<string, TransformedJetton>
): SwapInferenceResult {
  if (hasLendingProtocolMarker(transactions)) {
    return { inferredTransactions: [], unclassifiedClusters: [] };
  }

  const hasNativeSwap = transactions.some(tx => tx.type === ChainActionType.JETTON_SWAP);
  if (hasNativeSwap) {
    return { inferredTransactions: [], unclassifiedClusters: [] };
  }

  const consumed = new Set<number>();
  const inferredTransactions: TransformedTransaction[] = [];
  const inferenceIndex = 0;

  const tryInOrder = [tryInferJettonToTon, tryInferTonToJetton, tryInferJettonToJetton] as const;

  for (const tryInfer of tryInOrder) {
    const inferred = tryInfer({
      transactions,
      jettonsByAddress,
      consumed,
      accountRaw,
      inferenceIndex,
    });

    if (inferred) {
      inferredTransactions.push(inferred);
      break;
    }
  }

  const unclassifiedClusters: UnclassifiedSwapCluster[] = [];
  if (inferredTransactions.length === 0) {
    const cluster = detectUnclassifiedCluster(transactions, jettonsByAddress, consumed);
    if (cluster) {
      unclassifiedClusters.push(cluster);
    }
  }

  return { inferredTransactions, unclassifiedClusters };
}

/**
 * Returns true when an action type participates in swap aggregation / PnL.
 */
export function isSwapAggregateActionType(type: ChainActionType): boolean {
  return (SWAP_AGGREGATE_ACTION_TYPES as readonly ChainActionType[]).includes(type);
}
