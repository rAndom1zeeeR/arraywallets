import Link from "next/link";
import { Suspense } from "react";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { SwapJettonTable } from "@/modules/swap/presentation/components/SwapJettonTable";
import { TonviewerTransactionLink } from "@/modules/wallet/presentation/components/TonviewerTransactionLink";
import { getRelatedSwapsForJetton } from "@/modules/swap/domain/swap-transaction-list.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import { DataTableShell } from "@/shared/presentation/components/data-table/data-table-shell";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

interface SwapSummaryPanelProps {
  address: string;
  stats: WalletSwapStatsResult;
}

const LEG_KIND_LABELS: Record<string, string> = {
  ton_jetton: "TON → Jetton",
  jetton_ton: "Jetton → TON",
  jetton_jetton: "Jetton ↔ Jetton",
  ton_ton: "TON ↔ TON",
  unknown: "Other",
};

function formatLegCounts(swaps: WalletSwapStatsResult["swaps"]): { kind: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const swap of swaps) {
    const label = LEG_KIND_LABELS[swap.legKind] ?? swap.legKind;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);
}

export function SwapSummaryPanel({ address, stats }: SwapSummaryPanelProps) {
  const {
    aggregate,
    byJetton,
    swaps,
    nativeSwapCount,
    inferredSwapCount,
    flawedHeuristicCount,
    unclassified,
  } = stats;

  const legCounts = formatLegCounts(swaps);
  const recentSwaps = swaps.slice(0, 8);

  const relatedByJetton = Object.fromEntries(
    byJetton.map(row => [row.jetton.address.toLowerCase(), getRelatedSwapsForJetton(swaps, row.jetton.address)])
  );

  if (aggregate.swapCount === 0 && unclassified.length === 0) {
    return (
      <section className={cn(pageStyles.section, "border-dashed")}>
        <h2 className={pageStyles.sectionTitle}>Jetton swaps</h2>
        <p className={pageStyles.sectionSubtitle}>No swap actions in DB for this wallet yet.</p>
      </section>
    );
  }

  return (
    <section
      id="wallet-tabpanel-swaps"
      role="tabpanel"
      aria-labelledby="wallet-tab-swaps"
      className="space-y-6"
    >
      <div className={pageStyles.section}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={pageStyles.sectionTitle}>Jetton swaps</h2>
            <p className={pageStyles.sectionSubtitle}>
              Aggregated swaps ({aggregate.swapCount} total)
              {nativeSwapCount > 0 && (
                <>
                  {" "}
                  · <code className="text-xs">JETTON_SWAP</code> {nativeSwapCount}
                </>
              )}
              {inferredSwapCount > 0 && (
                <>
                  {" "}
                  · <code className="text-xs">INFERRED_SWAP</code> {inferredSwapCount}
                </>
              )}
              {flawedHeuristicCount > 0 && (
                <>
                  {" "}
                  · flawed heuristic {flawedHeuristicCount}
                </>
              )}
            </p>
          </div>
          <Link
            href={getWalletPagePath(address, { tab: "events", type: "JETTON_SWAP" })}
            className="text-sm font-medium text-primary hover:underline"
          >
            Show in Events ↓
          </Link>
        </div>

        {legCounts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {legCounts.map(({ kind, count }) => (
              <span key={kind} className={pageStyles.pill}>
                {kind}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {byJetton.length > 0 && (
        <DataTableShell
          title="By jetton"
          subtitle="Asset + Price · Sold/Bought · TON got/paid · Other = USDT etc."
        >
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading jetton table…</p>}>
            <SwapJettonTable rows={byJetton} relatedByJetton={relatedByJetton} />
          </Suspense>
        </DataTableShell>
      )}

      {aggregate.byDex.length > 0 && (
        <div className={pageStyles.section}>
          <h3 className="text-sm font-medium text-foreground">By DEX</h3>
          <ul className="mt-3 space-y-1 text-sm">
            {aggregate.byDex.map(row => (
              <li
                key={row.dex}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
              >
                <span className="font-medium text-foreground">{row.dex}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.count} swaps · −{formatTonFromNanoton(row.tonInNanoton)} · +
                  {formatTonFromNanoton(row.tonOutNanoton)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unclassified.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-sm font-medium text-amber-400">
            Unclassified swap-like events ({unclassified.length})
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Transfer clusters that look like swaps but could not be inferred automatically. Click{" "}
            <strong className="text-foreground">Sync + repair</strong> in the page header.
          </p>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
            {unclassified.map(cluster => (
              <li
                key={`${cluster.tonEventId}-${cluster.reason}`}
                className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <time className="text-xs text-muted-foreground">{cluster.timestamp.toLocaleString()}</time>
                  <div className="flex flex-wrap items-center gap-2">
                    <TonviewerTransactionLink tonEventId={cluster.tonEventId} rawData={null} />
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                      {cluster.reason}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{cluster.hint}</p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {cluster.jettonOutSymbol && <>out: {cluster.jettonOutSymbol} · </>}
                  {cluster.jettonInSymbol && <>in: {cluster.jettonInSymbol} · </>}
                  TON in: {formatTonFromNanoton(cluster.tonInNanoton)} · out:{" "}
                  {formatTonFromNanoton(cluster.tonOutNanoton)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className={pageStyles.section}>
        <summary className="cursor-pointer text-sm font-medium text-primary">
          Recent swaps ({recentSwaps.length} of {swaps.length})
        </summary>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
          {recentSwaps.map(swap => (
            <li
              key={swap.id}
              className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time className="text-xs text-muted-foreground">{swap.timestamp.toLocaleString()}</time>
                <div className="flex flex-wrap gap-1">
                  {swap.isInferred && (
                    <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-xs text-violet-400">
                      inferred
                    </span>
                  )}
                  {swap.dex && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{swap.dex}</span>
                  )}
                </div>
              </div>
              <div className="mt-1 font-medium text-foreground">{swap.displayAmount ?? "—"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {LEG_KIND_LABELS[swap.legKind] ?? swap.legKind}
                {swap.inferenceReason && <> · {swap.inferenceReason}</>}
                {(swap.tonIn || swap.tonOut) && (
                  <>
                    {" "}
                    · TON in: {formatTonFromNanoton(parseNanoton(swap.tonIn))} · out:{" "}
                    {formatTonFromNanoton(parseNanoton(swap.tonOut))}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
