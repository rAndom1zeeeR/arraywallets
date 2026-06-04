import { formatMoneyJetton, formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import { parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type {
  JettonSwapBreakdown,
  SwapActionSnapshot,
  SwapJettonRef,
  WalletSwapAggregate,
} from "@/modules/swap/domain/swap-stats.utils";
import { isPtonLikeJetton } from "@/modules/swap/domain/wrapped-ton.utils";

const DEFAULT_USDT_DECIMALS = 6;

/** Exact stablecoin symbols after {@link normalizeUsdtSymbol}. */
const USDT_STABLECOIN_SYMBOLS = new Set(["USDT", "USDTT", "JUSDT"]);

/**
 * Known Tether USD jetton master on TON (USD₮, 6 decimals).
 * Stored in raw form to avoid parse failures at module init.
 */
const USDT_MASTER_RAW_ADDRESSES = new Set<string>([
  "0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe",
]);

function normalizeUsdtSymbol(symbol: string): string {
  return symbol.replace(/\s/g, "").toUpperCase().replace(/₮/g, "T");
}

/** LP / pool / vault tokens that embed "USDT" in the symbol but are not stablecoins. */
function isUsdtDerivativeSymbol(normalized: string): boolean {
  if (/[-/_]/.test(normalized)) {
    return true;
  }

  return /(?:^USDT(?:SLP|LP|POOL|VAULT|WLP|PLP)|(?:SLP|LP|POOL|VAULT|WLP|PLP)USDT$)/.test(normalized);
}

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
 * Excludes LP and pool tokens such as USDT-SLP (different decimals, not $1 peg).
 */
export function isUsdtLikeJetton(jetton: SwapJettonRef): boolean {
  const normalized = normalizeUsdtSymbol(jetton.symbol);

  if (isUsdtDerivativeSymbol(normalized)) {
    return false;
  }

  if (USDT_STABLECOIN_SYMBOLS.has(normalized)) {
    return true;
  }

  try {
    return USDT_MASTER_RAW_ADDRESSES.has(toRawTonAddress(jetton.address));
  } catch {
    return false;
  }
}

function formatUsdtRaw(raw: bigint, decimals: number): string {
  return formatMoneyJetton(raw, decimals, "USDT");
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

/** Normalizes stablecoin raw units to 6-decimal USDT scale before aggregation. */
function normalizeUsdtRaw(raw: bigint, decimals: number): bigint {
  if (decimals === DEFAULT_USDT_DECIMALS) {
    return raw;
  }

  if (decimals > DEFAULT_USDT_DECIMALS) {
    return raw / 10n ** BigInt(decimals - DEFAULT_USDT_DECIMALS);
  }

  return raw * 10n ** BigInt(DEFAULT_USDT_DECIMALS - decimals);
}

function aggregateUsdtFromSwaps(swaps: SwapActionSnapshot[]): AssetPnlTotals {
  let spentRaw = 0n;
  let receivedRaw = 0n;

  for (const swap of swaps) {
    const amountIn = parseNanoton(swap.amountIn);
    const amountOut = parseNanoton(swap.amountOut);

    if (swap.jettonIn && isUsdtLikeJetton(swap.jettonIn) && amountIn > 0n) {
      spentRaw += normalizeUsdtRaw(amountIn, swap.jettonIn.decimals);
    }

    if (swap.jettonOut && isUsdtLikeJetton(swap.jettonOut) && amountOut > 0n) {
      receivedRaw += normalizeUsdtRaw(amountOut, swap.jettonOut.decimals);
    }
  }

  return {
    spentRaw,
    receivedRaw,
    netRaw: receivedRaw - spentRaw,
  };
}

export function resolveUsdtDecimals(swaps: SwapActionSnapshot[]): number {
  void swaps;
  return DEFAULT_USDT_DECIMALS;
}

function buildJettonPnlLines(byJetton: JettonSwapBreakdown[]): JettonPnlLine[] {
  return byJetton
    .filter(row => !isUsdtLikeJetton(row.jetton) && !isPtonLikeJetton(row.jetton))
    .filter(row => {
      const netRaw = row.receivedRaw - row.spentRaw;
      return netRaw !== 0n || row.spentRaw > 0n || row.receivedRaw > 0n;
    })
    .map(row => {
      const netRaw = row.receivedRaw - row.spentRaw;

      return {
        jetton: row.jetton,
        spent: formatMoneyJetton(row.spentRaw, row.jetton.decimals, row.jetton.symbol),
        received: formatMoneyJetton(row.receivedRaw, row.jetton.decimals, row.jetton.symbol),
        net: formatMoneyJetton(netRaw, row.jetton.decimals, row.jetton.symbol),
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
    formatMoneyTonFromNanoton,
    formatMoneyTonFromNanoton,
    formatMoneyTonFromNanoton
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
