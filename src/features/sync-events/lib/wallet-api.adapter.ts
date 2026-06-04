import type { WalletSwapStatsResult } from "@/features/sync-events/model/swap-stats.service";
import type { SwapPnlSummary } from "@/features/sync-events/lib/swap-pnl.utils";
import type {
  SwapActionSnapshot,
  SwapDexBreakdown,
  SwapJettonRef,
  WalletSwapAggregate,
} from "@/features/sync-events/lib/swap-stats.utils";

interface SerializedAssetPnl {
  spent: string;
  received: string;
  net: string;
  spentRaw: string;
  receivedRaw: string;
  netRaw: string;
}

interface SerializedSwapPnlSummary {
  ton: SerializedAssetPnl;
  usdt: SerializedAssetPnl;
  jettonLines: Array<{
    jetton: SwapJettonRef;
    spent: string;
    received: string;
    net: string;
    spentRaw: string;
    receivedRaw: string;
    netRaw: string;
  }>;
}

interface SerializedSwapSnapshot extends Omit<SwapActionSnapshot, "timestamp"> {
  timestamp: string;
}

type SerializedBigint = bigint | string | number;

export interface SerializedWalletSwapStats extends Omit<WalletSwapStatsResult, "pnl" | "swaps" | "aggregate"> {
  pnl: SerializedSwapPnlSummary;
  swaps: SerializedSwapSnapshot[];
  aggregate: Omit<WalletSwapAggregate, "tonSpentNanoton" | "tonReceivedNanoton" | "tonNetNanoton" | "byDex"> & {
    tonSpentNanoton: SerializedBigint;
    tonReceivedNanoton: SerializedBigint;
    tonNetNanoton: SerializedBigint;
    byDex: Array<
      Omit<SwapDexBreakdown, "tonInNanoton" | "tonOutNanoton"> & {
        tonInNanoton: SerializedBigint;
        tonOutNanoton: SerializedBigint;
      }
    >;
  };
}

function reviveBigint(value: SerializedBigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  return BigInt(value);
}

function reviveAggregate(aggregate: SerializedWalletSwapStats["aggregate"]): WalletSwapAggregate {
  return {
    ...aggregate,
    tonSpentNanoton: reviveBigint(aggregate.tonSpentNanoton),
    tonReceivedNanoton: reviveBigint(aggregate.tonReceivedNanoton),
    tonNetNanoton: reviveBigint(aggregate.tonNetNanoton),
    byDex: aggregate.byDex.map(
      (row): SwapDexBreakdown => ({
        ...row,
        tonInNanoton: reviveBigint(row.tonInNanoton),
        tonOutNanoton: reviveBigint(row.tonOutNanoton),
      })
    ),
  };
}

function reviveAssetPnl(asset: SerializedAssetPnl): SwapPnlSummary["ton"] {
  return {
    spent: asset.spent,
    received: asset.received,
    net: asset.net,
    spentRaw: BigInt(asset.spentRaw),
    receivedRaw: BigInt(asset.receivedRaw),
    netRaw: BigInt(asset.netRaw),
  };
}

function reviveSwapPnlSummary(pnl: SerializedSwapPnlSummary): SwapPnlSummary {
  return {
    ton: reviveAssetPnl(pnl.ton),
    usdt: reviveAssetPnl(pnl.usdt),
    jettonLines: pnl.jettonLines.map(line => ({
      jetton: line.jetton,
      spent: line.spent,
      received: line.received,
      net: line.net,
      spentRaw: BigInt(line.spentRaw),
      receivedRaw: BigInt(line.receivedRaw),
      netRaw: BigInt(line.netRaw),
    })),
  };
}

export function reviveWalletSwapStats(stats: SerializedWalletSwapStats): WalletSwapStatsResult {
  return {
    ...stats,
    aggregate: reviveAggregate(stats.aggregate),
    pnl: reviveSwapPnlSummary(stats.pnl),
    swaps: stats.swaps.map(swap => ({
      ...swap,
      timestamp: new Date(swap.timestamp),
    })),
  };
}
