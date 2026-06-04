"use client";

import { useCallback, useId, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { JettonAssetCell } from "@/modules/jetton/presentation/components/JettonAssetCell";
import { JettonPriceCell } from "@/modules/jetton/presentation/components/JettonPriceCell";
import { hasDisplayableJettonPrice } from "@/modules/jetton/domain/jetton-price.utils";
import {
  getJettonRateQuote,
  useJettonRates,
} from "@/modules/jetton/presentation/hooks/use-jetton-rates";
import {
  getJettonSwapRoleLabel,
  type JettonRelatedSwapItem,
} from "@/modules/swap/domain/swap-transaction-list.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type { JettonSwapBreakdownFormatted } from "@/modules/swap/domain/swap-stats.utils";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.config";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import { DataTableSortHeader } from "@/shared/presentation/components/data-table/sortable-header";
import {
  createBigintSortingFn,
  createNullableNumberSortingFn,
  sumCounterpartAmounts,
} from "@/shared/presentation/components/data-table/sorting.utils";
import "@/shared/presentation/components/data-table/data-table.types";
import { cn } from "@/shared/lib/utils";

interface SwapJettonTableProps {
  rows: JettonSwapBreakdownFormatted[];
  relatedByJetton: Record<string, JettonRelatedSwapItem[]>;
  variant?: "swaps" | "pnl";
}

const rowHoverClass = {
  swaps: "border-orange-100/80 hover:bg-white/80 dark:border-orange-900/50 dark:hover:bg-gray-900/60",
  pnl: "border-sky-100/80 hover:bg-white/80 dark:border-sky-900/50 dark:hover:bg-gray-900/60",
} as const;

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

interface RelatedSwapsPanelProps {
  jettonSymbol: string;
  relatedSwaps: JettonRelatedSwapItem[];
}

function RelatedSwapsPanel({ jettonSymbol, relatedSwaps }: RelatedSwapsPanelProps) {
  return (
    <>
      <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        Related swaps for {jettonSymbol} ({relatedSwaps.length})
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
    </>
  );
}

interface SwapJettonTableRow extends JettonSwapBreakdownFormatted {
  relatedSwaps: JettonRelatedSwapItem[];
}

const columnHelper = createColumnHelper<SwapJettonTableRow>();

function resolveSortPriceUsd(
  row: JettonSwapBreakdownFormatted,
  rates: ReturnType<typeof useJettonRates>["data"]
): number | null {
  const dbUsd = row.jetton.price?.usd;
  if (dbUsd !== null && dbUsd !== undefined && dbUsd > 0) {
    return dbUsd;
  }

  const rate = getJettonRateQuote(rates, row.jetton.address);
  return rate?.usd ?? null;
}

export function SwapJettonTable({ rows, relatedByJetton, variant = "swaps" }: SwapJettonTableProps) {
  const panelIdPrefix = useId();
  const [sorting, setSorting] = useState<SortingState>([]);
  const addresses = useMemo(() => rows.map(row => row.jetton.address), [rows]);
  const needsLiveRates = useMemo(
    () => rows.some(row => !hasDisplayableJettonPrice(row.jetton.price)),
    [rows]
  );
  const { data: rates, isPending: isRatesLoading, isError: isRatesError } = useJettonRates(
    needsLiveRates ? addresses : []
  );

  const tableData = useMemo<SwapJettonTableRow[]>(
    () =>
      rows.map(row => ({
        ...row,
        relatedSwaps: relatedByJetton[row.jetton.address.toLowerCase()] ?? [],
      })),
    [rows, relatedByJetton]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.jetton.symbol.toLowerCase(), {
        id: "asset",
        header: ({ column }) => <DataTableSortHeader column={column} label="Asset" />,
        cell: ({ row }) => <JettonAssetCell jetton={row.original.jetton} />,
      }),
      columnHelper.accessor(row => resolveSortPriceUsd(row, rates), {
        id: "price",
        header: ({ column }) => <DataTableSortHeader column={column} label="Price" />,
        sortingFn: createNullableNumberSortingFn("price"),
        sortUndefined: "last",
        cell: ({ row }) => {
          const rate =
            row.original.jetton.price ?? getJettonRateQuote(rates, row.original.jetton.address);
          return (
            <JettonPriceCell
              rate={rate}
              isLoading={
                needsLiveRates &&
                !hasDisplayableJettonPrice(row.original.jetton.price) &&
                isRatesLoading
              }
            />
          );
        },
      }),
      columnHelper.accessor("spentRaw", {
        id: "sold",
        header: ({ column }) => (
          <DataTableSortHeader column={column} label="Sold" className="text-red-600 dark:text-red-400" />
        ),
        sortingFn: createBigintSortingFn("sold"),
        meta: { headerClassName: "text-red-600 dark:text-red-400", cellClassName: "text-red-600 dark:text-red-400" },
        cell: ({ row }) => row.original.spent,
      }),
      columnHelper.accessor("receivedRaw", {
        id: "bought",
        header: ({ column }) => (
          <DataTableSortHeader column={column} label="Bought" className="text-green-600 dark:text-green-400" />
        ),
        sortingFn: createBigintSortingFn("bought"),
        meta: {
          headerClassName: "text-green-600 dark:text-green-400",
          cellClassName: "text-green-600 dark:text-green-400",
        },
        cell: ({ row }) => row.original.received,
      }),
      columnHelper.accessor("tonReceivedNanoton", {
        id: "tonGot",
        header: ({ column }) => (
          <DataTableSortHeader column={column} label="TON got" className="text-green-600 dark:text-green-400" />
        ),
        sortingFn: createBigintSortingFn("tonGot"),
        meta: {
          headerClassName: "text-green-600 dark:text-green-400",
          cellClassName: "text-green-600 dark:text-green-400",
        },
        cell: ({ row }) => row.original.tonReceived,
      }),
      columnHelper.accessor("tonPaidNanoton", {
        id: "tonPaid",
        header: ({ column }) => (
          <DataTableSortHeader column={column} label="TON paid" className="text-red-600 dark:text-red-400" />
        ),
        sortingFn: createBigintSortingFn("tonPaid"),
        meta: { headerClassName: "text-red-600 dark:text-red-400", cellClassName: "text-red-600 dark:text-red-400" },
        cell: ({ row }) => row.original.tonPaid,
      }),
      columnHelper.accessor(row => sumCounterpartAmounts(row.counterpartsReceived), {
        id: "otherGot",
        header: ({ column }) => (
          <DataTableSortHeader column={column} label="Other got" className="text-green-600 dark:text-green-400" />
        ),
        sortingFn: createBigintSortingFn("otherGot"),
        meta: {
          headerClassName: "text-green-600 dark:text-green-400",
          cellClassName: "text-green-600 dark:text-green-400",
        },
        cell: ({ row }) => row.original.counterpartsReceivedText,
      }),
      columnHelper.accessor(row => sumCounterpartAmounts(row.counterpartsPaid), {
        id: "otherPaid",
        header: ({ column }) => (
          <DataTableSortHeader column={column} label="Other paid" className="text-red-600 dark:text-red-400" />
        ),
        sortingFn: createBigintSortingFn("otherPaid"),
        meta: { headerClassName: "text-red-600 dark:text-red-400", cellClassName: "text-red-600 dark:text-red-400" },
        cell: ({ row }) => row.original.counterpartsPaidText,
      }),
      columnHelper.accessor(row => row.legsIn + row.legsOut, {
        id: "swaps",
        header: ({ column }) => <DataTableSortHeader column={column} label="Swaps" className="text-gray-400" />,
        meta: { headerClassName: "text-gray-400" },
        cell: ({ row }) => (
          <span className="text-xs text-gray-500">
            sell {row.original.legsIn} · buy {row.original.legsOut}
          </span>
        ),
      }),
      columnHelper.display({
        id: "expand",
        header: " ",
        enableSorting: false,
        meta: { headerClassName: "text-right text-gray-400" },
        cell: ({ row }) => {
          const swapCount = row.original.relatedSwaps.length;
          const panelId = `${panelIdPrefix}-${row.id}`;

          if (swapCount === 0) {
            return <span className="text-xs text-gray-400">—</span>;
          }

          return (
            <div className="text-right">
              <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                aria-expanded={row.getIsExpanded()}
                aria-controls={panelId}
                className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-gray-900 dark:text-sky-300 dark:hover:bg-sky-950"
              >
                {row.getIsExpanded() ? "Less" : `More (${swapCount})`}
              </button>
            </div>
          );
        },
      }),
    ],
    [rates, isRatesLoading, needsLiveRates, panelIdPrefix]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: row => row.original.relatedSwaps.length > 0,
    getRowId: row => row.jetton.address,
  });

  const renderSubComponent = useCallback(
    (row: { original: SwapJettonTableRow; id: string }) => (
      <div id={`${panelIdPrefix}-${row.id}`}>
        <RelatedSwapsPanel
          jettonSymbol={row.original.jetton.symbol}
          relatedSwaps={row.original.relatedSwaps}
        />
      </div>
    ),
    [panelIdPrefix]
  );

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      {needsLiveRates && isRatesError && (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Не удалось обновить цены — показаны данные из кэша БД (если есть).
        </p>
      )}
      <DataTable
        table={table}
        tableClassName="min-w-[56rem] text-sm"
        theadClassName="bg-gray-50 text-left text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900/80"
        headerRowClassName="border-b border-gray-200 dark:border-gray-800"
        headerCellClassName="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-300"
        tbodyClassName="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950/40"
        getRowClassName={() => cn("border-b transition-colors", rowHoverClass[variant])}
        bodyCellClassName="px-3 py-3"
        subRowClassName="bg-sky-50/50 dark:bg-sky-950/20"
        subRowCellClassName="px-3 py-3"
        renderSubComponent={renderSubComponent}
      />
    </div>
  );
}
