import { formatJettonFromRaw, formatTonFromNanoton, parseNanoton } from "@/features/sync-events/lib/ton-amount.utils";
import type {
  JettonSwapBreakdown,
  SwapActionSnapshot,
  SwapJettonRef,
  WalletSwapAggregate,
} from "@/features/sync-events/lib/swap-stats.utils";

const DEFAULT_USDT_DECIMALS = 6;

export interface AssetPnlTotals {
  spentRaw: bigint;
  receivedRaw: bigint;
  netRaw: bigint;
}

export interface AssetPnlFormatted {
  spent: string;
  received: string;
  net: string;
  spentRaw: bigint;
  receivedRaw: bigint;
  netRaw: bigint;
}

export interface JettonPnlLine {
  jetton: SwapJettonRef;
  spent: string;
  received: string;
  net: string;
  spentRaw: bigint;
  receivedRaw: bigint;
  netRaw: bigint;
}

export interface SwapPnlSummary {
  ton: AssetPnlFormatted;
  usdt: AssetPnlFormatted;
  jettonLines: JettonPnlLine[];
}

/**
 * Detects USD₮ / USDT / jUSDT jetton masters on TON.
 */
export function isUsdtLikeJetton(jetton: SwapJettonRef): boolean {
  const normalized = jetton.symbol.replace(/\s/g, "").toUpperCase();
  return (
    normalized.includes("USDT") ||
    normalized === "USD₮" ||
    normalized === "JUSDT" ||
    (normalized.startsWith("USD") && normalized.endsWith("T"))
  );
}

function formatUsdtRaw(raw: bigint, decimals: number): string {
  return formatJettonFromRaw(raw, decimals, "USDT");
}

function buildAssetPnlFormatted(
  totals: AssetPnlTotals,
  formatSpent: (raw: bigint) => string,
  formatReceived: (raw: bigint) => string,
  formatNet: (raw: bigint) => string
): AssetPnlFormatted {
  return {
    spentRaw: totals.spentRaw,
    receivedRaw: totals.receivedRaw,
    netRaw: totals.netRaw,
    spent: formatSpent(totals.spentRaw),
    received: formatReceived(totals.receivedRaw),
    net: formatNet(totals.netRaw),
  };
}

function aggregateUsdtFromSwaps(swaps: SwapActionSnapshot[]): AssetPnlTotals {
  let spentRaw = 0n;
  let receivedRaw = 0n;

  for (const swap of swaps) {
    const amountIn = parseNanoton(swap.amountIn);
    const amountOut = parseNanoton(swap.amountOut);

    if (swap.jettonIn && isUsdtLikeJetton(swap.jettonIn) && amountIn > 0n) {
      spentRaw += amountIn;
    }

    if (swap.jettonOut && isUsdtLikeJetton(swap.jettonOut) && amountOut > 0n) {
      receivedRaw += amountOut;
    }
  }

  return {
    spentRaw,
    receivedRaw,
    netRaw: receivedRaw - spentRaw,
  };
}

export function resolveUsdtDecimals(swaps: SwapActionSnapshot[]): number {
  for (const swap of swaps) {
    if (swap.jettonIn && isUsdtLikeJetton(swap.jettonIn)) {
      return swap.jettonIn.decimals;
    }
    if (swap.jettonOut && isUsdtLikeJetton(swap.jettonOut)) {
      return swap.jettonOut.decimals;
    }
  }

  return DEFAULT_USDT_DECIMALS;
}

function buildJettonPnlLines(byJetton: JettonSwapBreakdown[]): JettonPnlLine[] {
  return byJetton
    .filter(row => !isUsdtLikeJetton(row.jetton))
    .filter(row => {
      const netRaw = row.receivedRaw - row.spentRaw;
      return netRaw !== 0n || row.spentRaw > 0n || row.receivedRaw > 0n;
    })
    .map(row => {
      const netRaw = row.receivedRaw - row.spentRaw;

      return {
        jetton: row.jetton,
        spent: formatJettonFromRaw(row.spentRaw, row.jetton.decimals, row.jetton.symbol),
        received: formatJettonFromRaw(row.receivedRaw, row.jetton.decimals, row.jetton.symbol),
        net: formatJettonFromRaw(netRaw, row.jetton.decimals, row.jetton.symbol),
        spentRaw: row.spentRaw,
        receivedRaw: row.receivedRaw,
        netRaw,
      };
    })
    .sort((a, b) => {
      const absA = a.netRaw < 0n ? -a.netRaw : a.netRaw;
      const absB = b.netRaw < 0n ? -b.netRaw : b.netRaw;
      if (absA !== absB) {
        return absA > absB ? -1 : 1;
      }
      return a.jetton.symbol.localeCompare(b.jetton.symbol);
    });
}

/**
 * Builds swap PnL summary in TON, USDT, and per-jetton native units.
 */
export function buildSwapPnlSummary(aggregate: WalletSwapAggregate, swaps: SwapActionSnapshot[]): SwapPnlSummary {
  const usdtDecimals = resolveUsdtDecimals(swaps);
  const usdtTotals = aggregateUsdtFromSwaps(swaps);

  const ton = buildAssetPnlFormatted(
    {
      spentRaw: aggregate.tonSpentNanoton,
      receivedRaw: aggregate.tonReceivedNanoton,
      netRaw: aggregate.tonNetNanoton,
    },
    formatTonFromNanoton,
    formatTonFromNanoton,
    formatTonFromNanoton
  );

  const usdt = buildAssetPnlFormatted(
    usdtTotals,
    raw => formatUsdtRaw(raw, usdtDecimals),
    raw => formatUsdtRaw(raw, usdtDecimals),
    raw => formatUsdtRaw(raw, usdtDecimals)
  );

  const jettonLines = buildJettonPnlLines(aggregate.byJetton);

  return { ton, usdt, jettonLines };
}
