import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import { formatTonAmount } from "@/modules/jetton/domain/money-format.utils";
import type { AssetPnlFormatted } from "@/modules/swap/domain/swap-pnl.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";

const NANOTON_PER_TON = 1_000_000_000n;

/** Ignore transfers below 1 TON (dust/spam). */
export const MIN_PURE_TRANSFER_NANOTON = NANOTON_PER_TON;

export function buildTonTransferPnlItemId(
  tonEventId: string,
  amountNanoton: bigint,
  direction: "INCOMING" | "OUTGOING"
): string {
  return `${tonEventId}:${amountNanoton.toString()}:${direction}`;
}

export interface TonTransferPnlItem {
  /** Stable list key — one event may contain several TON transfers. */
  id: string;
  tonEventId: string;
  timestampIso: string;
  direction: "INCOMING" | "OUTGOING";
  amountNanoton: bigint;
  amountTon: number;
  counterparty: string | null;
}

export interface TonTransferPnlSummary {
  withdrawnNanoton: bigint;
  depositedNanoton: bigint;
  withdrawnTon: number;
  depositedTon: number;
  withdrawalCount: number;
  depositCount: number;
  items: TonTransferPnlItem[];
}

export interface TonPnlWithTransfers {
  swapNetTon: number;
  /** Trading PnL from swaps (profit before/withdrawing to external wallets). */
  totalProfitTon: number;
  /** Swap net minus withdrawals plus pure deposits. */
  onWalletTon: number;
  onWalletNanoton: bigint;
  withdrawnTon: number;
  depositedTon: number;
  netWithdrawnTon: number;
}

export function nanotonToTonNumber(nanoton: bigint): number {
  return Number(nanoton) / Number(NANOTON_PER_TON);
}

export function emptyTonTransferPnlSummary(): TonTransferPnlSummary {
  return {
    withdrawnNanoton: 0n,
    depositedNanoton: 0n,
    withdrawnTon: 0,
    depositedTon: 0,
    withdrawalCount: 0,
    depositCount: 0,
    items: [],
  };
}

/**
 * Combines swap-flow net with pure wallet TON transfers for PnL display.
 */
export function computeTonPnlWithTransfers(
  flowPnl: AssetPnlFormatted,
  transfers: TonTransferPnlSummary
): TonPnlWithTransfers {
  const swapNetTon = nanotonToTonNumber(flowPnl.netRaw);
  const withdrawnTon = transfers.withdrawnTon;
  const depositedTon = transfers.depositedTon;
  const netWithdrawnTon = withdrawnTon - depositedTon;
  const onWalletNanoton = flowPnl.netRaw - transfers.withdrawnNanoton + transfers.depositedNanoton;
  const onWalletTon = nanotonToTonNumber(onWalletNanoton);

  return {
    swapNetTon,
    totalProfitTon: swapNetTon,
    onWalletTon,
    onWalletNanoton,
    withdrawnTon,
    depositedTon,
    netWithdrawnTon,
  };
}

/**
 * Adjusts TON portfolio line holdings after pure wallet transfers.
 */
export function patchTonPortfolioWithTransfers(
  line: JettonPortfolioPnlLine | null,
  tonPnl: TonPnlWithTransfers,
  transfers: TonTransferPnlSummary
): JettonPortfolioPnlLine | null {
  if (!line || (transfers.withdrawalCount === 0 && transfers.depositCount === 0)) {
    return line;
  }

  const holdingsNanoton = tonPnl.onWalletNanoton > 0n ? tonPnl.onWalletNanoton : 0n;

  return {
    ...line,
    holdingsRaw: holdingsNanoton,
    holdings: formatTonFromNanoton(holdingsNanoton),
    holdingsValueTon: tonPnl.onWalletTon,
    holdingsValue: formatTonAmount(tonPnl.onWalletTon),
  };
}

export function isDexFeeTonTransfer(displayDetails: string | null, metadata: unknown): boolean {
  const DTRADE_FEE_PATTERN = /dtrade/i;
  const DEDUST_PATTERN = /dedust/i;

  if (displayDetails && DTRADE_FEE_PATTERN.test(displayDetails)) {
    return true;
  }

  if (metadata && typeof metadata === "object") {
    const comment = (metadata as { comment?: unknown }).comment;
    if (typeof comment === "string") {
      return DTRADE_FEE_PATTERN.test(comment) || (DEDUST_PATTERN.test(comment) && comment.length > 0);
    }
  }

  return false;
}

export function isMeaningfulPureTransferAmount(amountNanoton: bigint): boolean {
  return amountNanoton >= MIN_PURE_TRANSFER_NANOTON;
}

export function parseTransferAmountNanoton(amount: { toString(): string } | null | undefined): bigint {
  if (!amount) {
    return 0n;
  }

  return parseNanoton(amount.toString());
}
