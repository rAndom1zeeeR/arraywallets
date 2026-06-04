import type { TonTransferPnlSummary } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import type { SwapPnlSummary } from "@/modules/swap/domain/swap-pnl.utils";
import {
  formatMoneyJetton,
  formatMoneyTonFromNanoton,
} from "@/modules/jetton/domain/money-format.utils";
import type {
  JettonCounterpartTotal,
  JettonSwapBreakdownFormatted,
  SwapActionSnapshot,
  SwapDexBreakdown,
  SwapJettonRef,
  WalletSwapAggregate,
} from "@/modules/swap/domain/swap-stats.utils";

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

interface SerializedTonTransferPnlItem extends Omit<TonTransferPnlSummary["items"][number], "amountNanoton"> {
  amountNanoton: SerializedBigint;
}

interface SerializedTonTransferPnlSummary extends Omit<TonTransferPnlSummary, "withdrawnNanoton" | "depositedNanoton" | "items"> {
  withdrawnNanoton: SerializedBigint;
  depositedNanoton: SerializedBigint;
  items: SerializedTonTransferPnlItem[];
}

interface SerializedJettonCounterpartTotal extends Omit<JettonCounterpartTotal, "amountRaw"> {
  amountRaw: SerializedBigint;
}

interface SerializedJettonSwapBreakdown extends Omit<
  JettonSwapBreakdownFormatted,
  "spentRaw" | "receivedRaw" | "tonPaidNanoton" | "tonReceivedNanoton" | "counterpartsReceived" | "counterpartsPaid"
> {
  spentRaw: SerializedBigint;
  receivedRaw: SerializedBigint;
  tonPaidNanoton: SerializedBigint;
  tonReceivedNanoton: SerializedBigint;
  counterpartsReceived: SerializedJettonCounterpartTotal[];
  counterpartsPaid: SerializedJettonCounterpartTotal[];
}

export interface SerializedWalletSwapStats extends Omit<
  WalletSwapStatsResult,
  "pnl" | "swaps" | "aggregate" | "tonTransfers" | "byJetton"
> {
  pnl: SerializedSwapPnlSummary;
  swaps: SerializedSwapSnapshot[];
  tonTransfers: SerializedTonTransferPnlSummary;
  byJetton: SerializedJettonSwapBreakdown[];
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

function revivePortfolioLine(
  line: SerializedWalletSwapStats["portfolio"][number]
): WalletSwapStatsResult["portfolio"][number] {
  return {
    ...line,
    holdingsRaw: BigInt(line.holdingsRaw),
    trades: line.trades.map(trade => ({
      ...trade,
      jettonAmountRaw: BigInt(trade.jettonAmountRaw),
    })),
  };
}

function reviveJettonSwapBreakdown(row: SerializedJettonSwapBreakdown): JettonSwapBreakdownFormatted {
  const spentRaw = reviveBigint(row.spentRaw);
  const receivedRaw = reviveBigint(row.receivedRaw);
  const tonPaidNanoton = reviveBigint(row.tonPaidNanoton);
  const tonReceivedNanoton = reviveBigint(row.tonReceivedNanoton);

  return {
    ...row,
    spentRaw,
    receivedRaw,
    tonPaidNanoton,
    tonReceivedNanoton,
    spent: formatMoneyJetton(spentRaw, row.jetton.decimals, row.jetton.symbol),
    received: formatMoneyJetton(receivedRaw, row.jetton.decimals, row.jetton.symbol),
    tonPaid: formatMoneyTonFromNanoton(tonPaidNanoton),
    tonReceived: formatMoneyTonFromNanoton(tonReceivedNanoton),
    counterpartsReceived: row.counterpartsReceived.map(item => ({
      ...item,
      amountRaw: reviveBigint(item.amountRaw),
    })),
    counterpartsPaid: row.counterpartsPaid.map(item => ({
      ...item,
      amountRaw: reviveBigint(item.amountRaw),
    })),
  };
}

function reviveTonTransferPnl(summary: SerializedTonTransferPnlSummary): TonTransferPnlSummary {
  return {
    ...summary,
    withdrawnNanoton: reviveBigint(summary.withdrawnNanoton),
    depositedNanoton: reviveBigint(summary.depositedNanoton),
    items: summary.items.map(item => ({
      ...item,
      amountNanoton: reviveBigint(item.amountNanoton),
    })),
  };
}

export function reviveWalletSwapStats(stats: SerializedWalletSwapStats): WalletSwapStatsResult {
  return {
    ...stats,
    aggregate: reviveAggregate(stats.aggregate),
    byJetton: stats.byJetton.map(reviveJettonSwapBreakdown),
    pnl: reviveSwapPnlSummary(stats.pnl),
    tonTransfers: reviveTonTransferPnl(stats.tonTransfers),
    tonPortfolio: stats.tonPortfolio ? revivePortfolioLine(stats.tonPortfolio) : null,
    usdtPortfolio: stats.usdtPortfolio ? revivePortfolioLine(stats.usdtPortfolio) : null,
    portfolio: stats.portfolio.map(revivePortfolioLine),
    swaps: stats.swaps.map(swap => ({
      ...swap,
      timestamp: new Date(swap.timestamp),
    })),
  };
}
