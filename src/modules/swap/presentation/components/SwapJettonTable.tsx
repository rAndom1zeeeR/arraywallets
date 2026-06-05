"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
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
import { formatMoneyJetton, formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type { JettonSwapBreakdownFormatted } from "@/modules/swap/domain/swap-stats.utils";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.public.config";
import { SwapJettonMobileList } from "@/modules/swap/presentation/components/SwapJettonMobileList";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import { ResponsiveDataTable } from "@/shared/presentation/components/data-table/responsive-data-table";
import { DataTableSortHeader } from "@/shared/presentation/components/data-table/sortable-header";
import {
  createBigintSortingFn,
  createNullableNumberSortingFn,
  sumCounterpartAmounts,
} from "@/shared/presentation/components/data-table/sorting.utils";
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import "@/shared/presentation/components/data-table/data-table.types";
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

interface RelatedSwapsPanelProps {
  jettonSymbol: string;
  relatedSwaps: JettonRelatedSwapItem[];
}

export function RelatedSwapsPanel({ jettonSymbol, relatedSwaps }: RelatedSwapsPanelProps) {
  return (
    <>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Related swaps for {jettonSymbol} ({relatedSwaps.length})
      </p>
      <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
        {relatedSwaps.map(swap => {
          const tonLine = formatSwapTonLine(swap.tonIn, swap.tonOut);
          const tonviewerHref = buildTonviewerTransactionUrl(swap.tonEventId, null, tonapiBaseUrl);

          return (
            <li
              key={swap.id}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time className="text-xs text-muted-foreground" dateTime={swap.timestampIso}>
                  {new Date(swap.timestampIso).toLocaleString()}
                </time>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-xs font-medium",
                      swap.role === "sold" && "bg-loss/10 text-loss",
                      swap.role === "bought" && "bg-profit/10 text-profit",
                      swap.role === "both" && "bg-primary/10 text-primary"
                    )}
                  >
                    {getJettonSwapRoleLabel(swap.role)}
                  </span>
                  {swap.dex && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{swap.dex}</span>
                  )}
                  {tonviewerHref && (
                    <a
                      href={tonviewerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Tonviewer ↗
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-1 font-medium text-foreground">{swap.displayAmount ?? "—"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
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

function resolveSortPriceUsd(row: JettonSwapBreakdownFormatted): number | null {
  const dbUsd = row.jetton.price?.usd;
  if (dbUsd !== null && dbUsd !== undefined && dbUsd > 0) {
    return dbUsd;
  }

  return null;
}

export function SwapJettonTable({ rows, relatedByJetton }: SwapJettonTableProps) {
  const panelIdPrefix = useId();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  const toggleExpandedRow = useCallback((rowId: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);
  const addresses = useMemo(() => rows.map(row => row.jetton.address), [rows]);
  const needsLiveRates = useMemo(
    () => rows.some(row => !hasDisplayableJettonPrice(row.jetton.price)),
    [rows]
  );
  const { data: rates, isPending: isRatesLoading, isError: isRatesError } = useJettonRates(
    needsLiveRates ? addresses : []
  );

  const ratesRef = useRef(rates);
  const isRatesLoadingRef = useRef(isRatesLoading);
  ratesRef.current = rates;
  isRatesLoadingRef.current = isRatesLoading;

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
      columnHelper.accessor(row => resolveSortPriceUsd(row), {
        id: "price",
        header: ({ column }) => <DataTableSortHeader column={column} label="Price" />,
        sortingFn: createNullableNumberSortingFn("price"),
        sortUndefined: "last",
        meta: { align: "right" },
        cell: ({ row }) => {
          const rate =
            row.original.jetton.price ??
            getJettonRateQuote(ratesRef.current, row.original.jetton.address);
          return (
            <JettonPriceCell
              rate={rate}
              isLoading={
                needsLiveRates &&
                !hasDisplayableJettonPrice(row.original.jetton.price) &&
                isRatesLoadingRef.current
              }
            />
          );
        },
      }),
      columnHelper.accessor("spentRaw", {
        id: "sold",
        header: ({ column }) => <DataTableSortHeader column={column} label="Sold" className="text-loss" />,
        sortingFn: createBigintSortingFn("sold"),
        meta: { align: "right", headerClassName: "text-loss", cellClassName: "text-loss tabular-nums" },
        cell: ({ row }) =>
          formatMoneyJetton(row.original.spentRaw, row.original.jetton.decimals, row.original.jetton.symbol),
      }),
      columnHelper.accessor("receivedRaw", {
        id: "bought",
        header: ({ column }) => <DataTableSortHeader column={column} label="Bought" className="text-profit" />,
        sortingFn: createBigintSortingFn("bought"),
        meta: { align: "right", headerClassName: "text-profit", cellClassName: "text-profit tabular-nums" },
        cell: ({ row }) =>
          formatMoneyJetton(row.original.receivedRaw, row.original.jetton.decimals, row.original.jetton.symbol),
      }),
      columnHelper.accessor("tonReceivedNanoton", {
        id: "tonGot",
        header: ({ column }) => <DataTableSortHeader column={column} label="TON got" className="text-profit" />,
        sortingFn: createBigintSortingFn("tonGot"),
        meta: {
          align: "right",
          hideBelow: "md",
          headerClassName: "text-profit",
          cellClassName: "text-profit tabular-nums",
        },
        cell: ({ row }) => formatMoneyTonFromNanoton(row.original.tonReceivedNanoton),
      }),
      columnHelper.accessor("tonPaidNanoton", {
        id: "tonPaid",
        header: ({ column }) => <DataTableSortHeader column={column} label="TON paid" className="text-loss" />,
        sortingFn: createBigintSortingFn("tonPaid"),
        meta: {
          align: "right",
          hideBelow: "md",
          headerClassName: "text-loss",
          cellClassName: "text-loss tabular-nums",
        },
        cell: ({ row }) => formatMoneyTonFromNanoton(row.original.tonPaidNanoton),
      }),
      columnHelper.accessor(row => sumCounterpartAmounts(row.counterpartsReceived), {
        id: "otherGot",
        header: ({ column }) => <DataTableSortHeader column={column} label="Other got" className="text-profit" />,
        sortingFn: createBigintSortingFn("otherGot"),
        meta: {
          align: "right",
          hideBelow: "lg",
          headerClassName: "text-profit",
          cellClassName: "text-profit tabular-nums",
        },
        cell: ({ row }) => row.original.counterpartsReceivedText,
      }),
      columnHelper.accessor(row => sumCounterpartAmounts(row.counterpartsPaid), {
        id: "otherPaid",
        header: ({ column }) => <DataTableSortHeader column={column} label="Other paid" className="text-loss" />,
        sortingFn: createBigintSortingFn("otherPaid"),
        meta: {
          align: "right",
          hideBelow: "lg",
          headerClassName: "text-loss",
          cellClassName: "text-loss tabular-nums",
        },
        cell: ({ row }) => row.original.counterpartsPaidText,
      }),
      columnHelper.accessor(row => row.legsIn + row.legsOut, {
        id: "swaps",
        header: ({ column }) => <DataTableSortHeader column={column} label="Swaps" />,
        meta: { align: "right", hideBelow: "sm" },
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            sell {row.original.legsIn} · buy {row.original.legsOut}
          </span>
        ),
      }),
      columnHelper.display({
        id: "expand",
        header: " ",
        enableSorting: false,
        meta: { align: "right", headerClassName: "text-muted-foreground" },
        cell: ({ row, table }) => {
          const swapCount = row.original.relatedSwaps.length;
          const panelId = `${panelIdPrefix}-${row.id}`;
          const expandMeta = table.options.meta?.expand;

          if (swapCount === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          if (!expandMeta) {
            return null;
          }

          const isExpanded = expandMeta.expandedRowIds[row.id] ?? false;

          return (
            <div className="text-right">
              <button
                type="button"
                onClick={() => expandMeta.toggleExpandedRow(row.id)}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className={buttonStyles.ghost}
              >
                {isExpanded ? "Less" : `More (${swapCount})`}
              </button>
            </div>
          );
        },
      }),
    ],
    [needsLiveRates, panelIdPrefix]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    meta: {
      expand: {
        expandedRowIds,
        toggleExpandedRow,
      },
    },
    initialState: { sorting: [] },
    state: { sorting },
    onSortingChange: setSorting,
    enableSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
    <div>
      {needsLiveRates && isRatesError && (
        <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Failed to refresh prices — showing cached DB data (if available).
        </p>
      )}
      <ResponsiveDataTable
        mobile={<SwapJettonMobileList rows={rows} relatedByJetton={relatedByJetton} />}
        desktop={
          <DataTable
            table={table}
            tableClassName="min-w-[32rem] lg:min-w-[56rem]"
            isRowExpanded={row => expandedRowIds[row.id] ?? false}
            renderSubComponent={renderSubComponent}
          />
        }
      />
    </div>
  );
}
