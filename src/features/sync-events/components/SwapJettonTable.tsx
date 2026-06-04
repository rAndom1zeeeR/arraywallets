"use client";

import { useCallback, useId, useState } from "react";
import {
  getJettonSwapRoleLabel,
  type JettonRelatedSwapItem,
} from "@/features/sync-events/lib/swap-transaction-list.utils";
import { formatTonFromNanoton, parseNanoton } from "@/features/sync-events/lib/ton-amount.utils";
import type { JettonSwapBreakdownFormatted } from "@/features/sync-events/lib/swap-stats.utils";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.config";
import { cn } from "@/shared/lib/utils";

interface SwapJettonTableProps {
  rows: JettonSwapBreakdownFormatted[];
  relatedByJetton: Record<string, JettonRelatedSwapItem[]>;
}

function formatSwapTonLine(tonIn: string | null, tonOut: string | null): string | null {
  const parts: string[] = [];

  if (tonIn && parseNanoton(tonIn) > 0n) {
    parts.push(`TON in: ${formatTonFromNanoton(parseNanoton(tonIn))}`);
  }

  if (tonOut && parseNanoton(tonOut) > 0n) {
    parts.push(`TON out: ${formatTonFromNanoton(parseNanoton(tonOut))}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

interface JettonSwapRowProps {
  row: JettonSwapBreakdownFormatted;
  relatedSwaps: JettonRelatedSwapItem[];
}

function JettonSwapRow({ row, relatedSwaps }: JettonSwapRowProps) {
  const panelId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const swapCount = relatedSwaps.length;

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <>
      <tr className="border-b border-orange-100/80 bg-white/60 dark:border-orange-900/50 dark:bg-gray-900/40">
        <td className="px-2 py-2">
          <div className="font-medium">{row.jetton.symbol}</div>
          <div className="text-xs text-gray-500">{row.jetton.name}</div>
        </td>
        <td className="px-2 py-2 text-red-600 dark:text-red-400">{row.spent}</td>
        <td className="px-2 py-2 text-green-600 dark:text-green-400">{row.received}</td>
        <td className="px-2 py-2 text-green-600 dark:text-green-400">{row.tonReceived}</td>
        <td className="px-2 py-2 text-red-600 dark:text-red-400">{row.tonPaid}</td>
        <td className="px-2 py-2 text-green-600 dark:text-green-400">{row.counterpartsReceivedText}</td>
        <td className="px-2 py-2 text-red-600 dark:text-red-400">{row.counterpartsPaidText}</td>
        <td className="px-2 py-2 text-xs text-gray-500">
          sell {row.legsIn} · buy {row.legsOut}
        </td>
        <td className="px-2 py-2 text-right">
          {swapCount > 0 ? (
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-gray-900 dark:text-sky-300 dark:hover:bg-sky-950"
            >
              {isExpanded ? "Less" : `More (${swapCount})`}
            </button>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
      </tr>

      {isExpanded && swapCount > 0 && (
        <tr className="bg-sky-50/50 dark:bg-sky-950/20">
          <td colSpan={9} className="px-3 py-3" id={panelId}>
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
              Related swaps for {row.jetton.symbol} ({swapCount})
            </p>
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {relatedSwaps.map(swap => {
                const tonLine = formatSwapTonLine(swap.tonIn, swap.tonOut);
                const tonviewerHref = buildTonviewerTransactionUrl(swap.tonEventId, null, tonapiBaseUrl);

                return (
                  <li
                    key={swap.id}
                    className="rounded border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <time className="text-xs text-gray-500" dateTime={swap.timestampIso}>
                        {new Date(swap.timestampIso).toLocaleString()}
                      </time>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-medium",
                            swap.role === "sold" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
                            swap.role === "bought" &&
                              "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
                            swap.role === "both" &&
                              "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
                          )}
                        >
                          {getJettonSwapRoleLabel(swap.role)}
                        </span>
                        {swap.dex && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{swap.dex}</span>
                        )}
                        {tonviewerHref && (
                          <a
                            href={tonviewerHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                          >
                            Tonviewer ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 font-medium">{swap.displayAmount ?? "—"}</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {swap.legKindLabel}
                      {swap.jettonInSymbol && swap.jettonOutSymbol && (
                        <>
                          {" "}
                          · {swap.jettonInSymbol} → {swap.jettonOutSymbol}
                        </>
                      )}
                      {tonLine && <> · {tonLine}</>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export function SwapJettonTable({ rows, relatedByJetton }: SwapJettonTableProps) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-orange-200 text-left text-xs tracking-wide text-gray-500 uppercase dark:border-orange-900">
            <th className="px-2 py-1.5 font-medium">Jetton</th>
            <th className="px-2 py-1.5 font-medium text-red-600 dark:text-red-400">Sold</th>
            <th className="px-2 py-1.5 font-medium text-green-600 dark:text-green-400">Bought</th>
            <th className="px-2 py-1.5 font-medium text-green-600 dark:text-green-400">TON got</th>
            <th className="px-2 py-1.5 font-medium text-red-600 dark:text-red-400">TON paid</th>
            <th className="px-2 py-1.5 font-medium text-green-600 dark:text-green-400">Other got</th>
            <th className="px-2 py-1.5 font-medium text-red-600 dark:text-red-400">Other paid</th>
            <th className="px-2 py-1.5 font-medium text-gray-400">Swaps</th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-400"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <JettonSwapRow
              key={row.jetton.address}
              row={row}
              relatedSwaps={relatedByJetton[row.jetton.address.toLowerCase()] ?? []}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
