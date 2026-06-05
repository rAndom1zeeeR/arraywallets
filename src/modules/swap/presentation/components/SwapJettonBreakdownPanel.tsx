import { Suspense } from "react";
import { getRelatedSwapsForJetton } from "@/modules/swap/domain/swap-transaction-list.utils";
import { SwapJettonTable } from "@/modules/swap/presentation/components/SwapJettonTable";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface SwapJettonBreakdownPanelProps {
  stats: WalletSwapStatsResult;
  className?: string;
}

export function SwapJettonBreakdownPanel({ stats, className }: SwapJettonBreakdownPanelProps) {
  const { byJetton, swaps, aggregate, unclassified } = stats;

  const relatedByJetton = Object.fromEntries(
    byJetton.map(row => [
      row.jetton.address.toLowerCase(),
      getRelatedSwapsForJetton(swaps, row.jetton.address),
    ])
  );

  if (aggregate.swapCount === 0 && unclassified.length === 0) {
    return null;
  }

  if (byJetton.length === 0) {
    return (
      <div
        className={cn(
          "px-4 py-12 text-center text-sm text-muted-foreground lg:px-5",
          className
        )}
      >
        No jetton breakdown available yet.
      </div>
    );
  }

  return (
    <div className={cn(explorerStyles.tableShell, className)}>
      <div className={explorerStyles.cardHeader}>
        <div>
          <span className="text-sm font-semibold text-foreground">By jetton</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Asset + Price · Sold/Bought · TON got/paid · Other = USDT etc.
          </p>
        </div>
      </div>
      <div className={explorerStyles.tableScroll}>
        <Suspense
          fallback={
            <p className="px-4 py-8 text-sm text-muted-foreground lg:px-5">
              Loading jetton table…
            </p>
          }
        >
          <SwapJettonTable rows={byJetton} relatedByJetton={relatedByJetton} />
        </Suspense>
      </div>
    </div>
  );
}
