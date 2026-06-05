"use client";

import Link from "next/link";
import { formatSwapLegCounts } from "@/modules/swap/domain/swap-stats-display.utils";
import { TonviewerTransactionLink } from "@/modules/wallet/presentation/components/TonviewerTransactionLink";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import { formatTonFromNanoton } from "@/shared/lib/ton/ton-amount.utils";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface SwapStatsSidebarPanelProps {
  address: string;
  stats: WalletSwapStatsResult;
  className?: string;
}

export const SwapStatsSidebarPanel = ({
  address,
  stats,
  className,
}: SwapStatsSidebarPanelProps) => {
  const {
    aggregate,
    swaps,
    nativeSwapCount,
    inferredSwapCount,
    flawedHeuristicCount,
    unclassified,
  } = stats;

  const legCounts = formatSwapLegCounts(swaps);
  const isEmpty = aggregate.swapCount === 0 && unclassified.length === 0;

  if (isEmpty) {
    return (
      <section
        className={cn(explorerStyles.card, className)}
        aria-label="Jetton swap statistics"
      >
        <div className={explorerStyles.cardHeader}>
          <span className="text-sm font-semibold text-foreground">Jetton swaps</span>
        </div>
        <p className="px-5 py-4 text-sm text-muted-foreground">
          No swap actions in DB for this wallet yet.
        </p>
      </section>
    );
  }

  return (
    <section className={cn(explorerStyles.card, className)} aria-label="Jetton swap statistics">
      <div className={explorerStyles.cardHeader}>
        <span className="text-sm font-semibold text-foreground">Jetton swaps</span>
        <Link
          href={getWalletPagePath(address, { tab: "events", type: "JETTON_SWAP" })}
          className="text-xs font-medium text-primary hover:underline"
        >
          Show in Events
        </Link>
      </div>

      <div className={explorerStyles.cardBody}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Aggregated swaps ({aggregate.swapCount} total)
          {nativeSwapCount > 0 && (
            <>
              {" "}
              · <span className="text-foreground">JETTON_SWAP {nativeSwapCount}</span>
            </>
          )}
          {inferredSwapCount > 0 && (
            <>
              {" "}
              · <span className="text-foreground">INFERRED_SWAP {inferredSwapCount}</span>
            </>
          )}
          {flawedHeuristicCount > 0 && (
            <>
              {" "}
              · flawed heuristic {flawedHeuristicCount}
            </>
          )}
        </p>

        {legCounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {legCounts.map(({ kind, count }) => (
              <span
                key={kind}
                className="inline-flex items-center rounded-lg border border-border bg-explorer-surface-2 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {kind}: {count}
              </span>
            ))}
          </div>
        )}

        {aggregate.byDex.length > 0 && (
          <>
            <div className={explorerStyles.divider} />
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                By DEX
              </p>
              <ul className="mt-2 space-y-1.5">
                {aggregate.byDex.map(row => (
                  <li
                    key={row.dex}
                    className="rounded-lg border border-border bg-explorer-surface-2/60 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{row.dex}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {row.count} swaps
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      <span className="text-loss">−{formatTonFromNanoton(row.tonInNanoton)}</span>
                      {" · "}
                      <span className="text-profit">+{formatTonFromNanoton(row.tonOutNanoton)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {unclassified.length > 0 && (
          <>
            <div className={explorerStyles.divider} />
            <div className="rounded-lg border border-chart-5/30 bg-chart-5/5 p-3">
              <p className="text-xs font-semibold text-chart-5">
                Unclassified swap-like events ({unclassified.length})
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Transfer clusters that look like swaps but could not be inferred automatically. Run{" "}
                <strong className="font-medium text-foreground">Sync + repair</strong>.
              </p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {unclassified.map(cluster => (
                  <li
                    key={`${cluster.tonEventId}-${cluster.reason}`}
                    className="rounded-lg border border-border bg-explorer-surface-2/60 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <time className="text-[11px] text-muted-foreground">
                        {cluster.timestamp.toLocaleString()}
                      </time>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TonviewerTransactionLink
                          tonEventId={cluster.tonEventId}
                          rawData={null}
                          className="text-[11px]"
                        />
                        <span className="rounded bg-chart-5/15 px-1.5 py-0.5 text-[10px] font-medium text-chart-5">
                          {cluster.reason}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{cluster.hint}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {cluster.jettonOutSymbol && <>out: {cluster.jettonOutSymbol} · </>}
                      {cluster.jettonInSymbol && <>in: {cluster.jettonInSymbol} · </>}
                      TON in: {formatTonFromNanoton(cluster.tonInNanoton)} · out:{" "}
                      {formatTonFromNanoton(cluster.tonOutNanoton)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
