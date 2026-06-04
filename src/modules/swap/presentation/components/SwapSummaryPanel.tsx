import Link from "next/link";
import { Suspense } from "react";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { SwapJettonTable } from "@/modules/swap/presentation/components/SwapJettonTable";
import { TonviewerTransactionLink } from "@/modules/wallet/presentation/components/TonviewerTransactionLink";
import { getRelatedSwapsForJetton } from "@/modules/swap/domain/swap-transaction-list.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";

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
      <section className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Jetton swaps</h2>
        <p className="mt-1 text-sm text-gray-500">No swap actions in DB for this wallet yet.</p>
      </section>
    );
  }

  return (
    <section
      id="wallet-tabpanel-swaps"
      role="tabpanel"
      aria-labelledby="wallet-tab-swaps"
      className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Jetton swaps</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
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
          href={getWalletPagePath(address, { tab: "events", swaps: true })}
          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          Show in Events ↓
        </Link>
      </div>

      {legCounts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {legCounts.map(({ kind, count }) => (
            <span
              key={kind}
              className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-900 dark:bg-orange-900/50 dark:text-orange-100"
            >
              {kind}: {count}
            </span>
          ))}
        </div>
      )}

      {byJetton.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">By jetton</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Asset + Price (TonAPI) · Sold/Bought = jetton отдан/получен · TON got/paid · Other = USDT и др.
          </p>
          <Suspense fallback={<p className="mt-2 text-sm text-gray-500">Loading jetton table…</p>}>
            <SwapJettonTable rows={byJetton} relatedByJetton={relatedByJetton} />
          </Suspense>
        </div>
      )}

      {aggregate.byDex.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">By DEX</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {aggregate.byDex.map(row => (
              <li
                key={row.dex}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded border border-orange-100 bg-white/60 px-2 py-1 dark:border-orange-900 dark:bg-gray-900/40"
              >
                <span className="font-medium">{row.dex}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {row.count} swaps · −{formatTonFromNanoton(row.tonInNanoton)} · +
                  {formatTonFromNanoton(row.tonOutNanoton)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unclassified.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Unclassified swap-like events ({unclassified.length})
          </h3>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
            Transfer clusters that look like swaps but could not be inferred automatically. Нажми{" "}
            <strong>Sync + repair</strong> в шапке страницы.
          </p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
            {unclassified.map(cluster => (
              <li
                key={`${cluster.tonEventId}-${cluster.reason}`}
                className="rounded border border-amber-200 bg-white/70 px-2 py-1.5 dark:border-amber-900 dark:bg-gray-900/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <time className="text-xs text-gray-500">{cluster.timestamp.toLocaleString()}</time>
                  <div className="flex flex-wrap items-center gap-2">
                    <TonviewerTransactionLink tonEventId={cluster.tonEventId} rawData={null} />
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs dark:bg-amber-900/60">
                      {cluster.reason}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{cluster.hint}</p>
                <p className="mt-0.5 text-xs text-gray-500">
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

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-sky-600 dark:text-sky-400">
          Recent swaps ({recentSwaps.length} of {swaps.length})
        </summary>
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
          {recentSwaps.map(swap => (
            <li
              key={swap.id}
              className="rounded border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time className="text-xs text-gray-500">{swap.timestamp.toLocaleString()}</time>
                <div className="flex flex-wrap gap-1">
                  {swap.isInferred && (
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-900 dark:bg-violet-900/50 dark:text-violet-100">
                      inferred
                    </span>
                  )}
                  {swap.dex && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{swap.dex}</span>
                  )}
                </div>
              </div>
              <div className="mt-1 font-medium">{swap.displayAmount ?? "—"}</div>
              <div className="mt-0.5 text-xs text-gray-500">
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
