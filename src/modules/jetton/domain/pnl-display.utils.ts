import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import { cn } from "@/shared/lib/utils";

export type PnlTone = "profit" | "loss" | "neutral";

/** True when swap PnL cost basis is missing counterparty valuation in TON or USD. */
export function hasIncompletePnlValuation(
  swapStats: Pick<WalletSwapStatsResult, "tonPortfolio" | "portfolio">
): boolean {
  const { tonPortfolio, portfolio } = swapStats;

  if (tonPortfolio?.hasIncompleteTonBasis || tonPortfolio?.hasIncompleteUsdBasis) {
    return true;
  }

  return portfolio.some(
    line => line.hasIncompleteTonBasis || line.hasIncompleteUsdBasis
  );
}

export function pnlToneFromNumber(value: number | null | undefined): PnlTone {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value > 0) {
    return "profit";
  }

  if (value < 0) {
    return "loss";
  }

  return "neutral";
}

export function pnlToneFromBigint(value: bigint): PnlTone {
  if (value > 0n) {
    return "profit";
  }

  if (value < 0n) {
    return "loss";
  }

  return "neutral";
}

export function pnlToneClassName(tone: PnlTone): string {
  return cn(
    tone === "profit" && "text-profit",
    tone === "loss" && "text-loss",
    tone === "neutral" && "text-foreground"
  );
}

export function pnlClassNameFromNumber(value: number | null | undefined): string {
  return pnlToneClassName(pnlToneFromNumber(value));
}

export function pnlClassNameFromBigint(value: bigint): string {
  return pnlToneClassName(pnlToneFromBigint(value));
}
