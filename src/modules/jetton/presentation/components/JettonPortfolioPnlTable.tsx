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
import { PnlAmountStack } from "@/modules/jetton/presentation/components/PnlAmountStack";
import type { JettonPortfolioPnlLine, PortfolioTradeDetail } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import { formatTonUsdPair } from "@/modules/jetton/domain/money-format.utils";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.config";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import { DataTableSortHeader } from "@/shared/presentation/components/data-table/sortable-header";
import {
  createBigintSortingFn,
  createNullableNumberSortingFn,
} from "@/shared/presentation/components/data-table/sorting.utils";
import "@/shared/presentation/components/data-table/data-table.types";
import { cn } from "@/shared/lib/utils";

const LEG_KIND_LABELS: Record<string, string> = {
  ton_jetton: "TON → Jetton",
  jetton_ton: "Jetton → TON",
  jetton_jetton: "Jetton ↔ Jetton",
  ton_ton: "TON ↔ TON",
  unknown: "Other",
};

interface JettonPortfolioPnlTableProps {
  rows: JettonPortfolioPnlLine[];
}

interface MetricCellProps {
  primary: string | null;
  secondary?: string | null;
  tone?: "neutral" | "profit" | "loss";
  muted?: boolean;
}

function MetricCell({ primary, secondary, tone = "neutral", muted }: MetricCellProps) {
  if (!primary && !secondary) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className={cn("text-sm", muted && "opacity-70")}>
      {primary && (
        <div
          className={cn(
            "font-medium tabular-nums",
            tone === "profit" && "text-green-600 dark:text-green-400",
            tone === "loss" && "text-red-600 dark:text-red-400",
            tone === "neutral" && "text-gray-900 dark:text-gray-100"
          )}
        >
          {primary}
        </div>
      )}
      {secondary && <div className="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">{secondary}</div>}
    </div>
  );
}

function profitTone(value: number | null): "neutral" | "profit" | "loss" {
  if (value === null) {
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

function resolvePnlSortValue(row: JettonPortfolioPnlLine): number | null {
  return row.currentProfitUsd ?? row.currentProfitTon ?? null;
}

function resolveInvestedSortValue(row: JettonPortfolioPnlLine): number {
  if (row.totalInvestedUsd > 0) {
    return row.totalInvestedUsd;
  }

  return row.totalInvestedTon;
}

function resolvePriceSortValue(row: JettonPortfolioPnlLine): number | null {
  return row.currentPriceUsd ?? row.currentPriceTon ?? null;
}

interface PortfolioTradeCardProps {
  trade: PortfolioTradeDetail;
}

function PortfolioTradeCard({ trade }: PortfolioTradeCardProps) {
  const tonviewerHref = buildTonviewerTransactionUrl(trade.tonEventId, null, tonapiBaseUrl);

  return (
    <li className="rounded border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time className="text-xs text-gray-500" dateTime={trade.timestampIso}>
          {new Date(trade.timestampIso).toLocaleString()}
        </time>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium",
              trade.side === "sell" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
              trade.side === "buy" && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
            )}
          >
            {trade.side === "buy" ? "Buy" : "Sell"}
          </span>
          {trade.dex && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{trade.dex}</span>
          )}
          {(trade.incompleteTon || trade.incompleteUsd) && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {trade.incompleteTon && trade.incompleteUsd
                ? "Incomplete"
                : trade.incompleteTon
                  ? "TON incomplete"
                  : "USD incomplete"}
            </span>
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

      <div className="mt-1.5 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <span className="text-xs text-gray-500">Amount</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">{trade.jettonAmount}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Unit price · Total</span>
          <div className="font-medium tabular-nums">
            {trade.unitPriceDisplay ?? "—"}
            {(trade.totalTonFormatted || trade.totalUsdFormatted) && (
              <span className="text-gray-500">
                {" "}
                · {formatTonUsdPair(trade.totalTon, trade.totalUsd) ?? "—"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <span className="text-xs text-gray-500">{trade.side === "buy" ? "Paid" : "Received"}</span>
        <ul className="mt-0.5 space-y-0.5 text-xs text-gray-700 dark:text-gray-300">
          {trade.paymentLegs.map((leg, index) => (
            <li key={`${trade.swapId}-leg-${index}`} className="flex flex-wrap justify-between gap-2">
              <span>{leg.label}</span>
              <span className="font-medium tabular-nums">{formatTonUsdPair(leg.ton, leg.usd) ?? "—"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-1 text-xs text-gray-500">{LEG_KIND_LABELS[trade.legKind] ?? trade.legKind}</div>
    </li>
  );
}

const columnHelper = createColumnHelper<JettonPortfolioPnlLine>();

export function JettonPortfolioPnlTable({ rows }: JettonPortfolioPnlTableProps) {
  const panelIdPrefix = useId();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.jetton.symbol.toLowerCase(), {
        id: "asset",
        header: ({ column }) => <DataTableSortHeader column={column} label="Asset" />,
        cell: ({ row }) => <JettonAssetCell jetton={row.original.jetton} />,
      }),
      columnHelper.accessor(resolvePriceSortValue, {
        id: "price",
        header: ({ column }) => <DataTableSortHeader column={column} label="Price" />,
        sortingFn: createNullableNumberSortingFn("price"),
        sortUndefined: "last",
        cell: ({ row }) => {
          const diff24hRaw = row.original.jetton.price?.diff24hUsd;
          const diff24h =
            diff24hRaw !== null && diff24hRaw !== undefined ? Number.parseFloat(diff24hRaw) : null;
          const diff24hValid = diff24h !== null && Number.isFinite(diff24h);

          return (
            <MetricCell
              primary={row.original.currentPrice}
              secondary={
                diff24hValid
                  ? `${diff24h >= 0 ? "+" : ""}${diff24h.toFixed(2)}% 24h`
                  : row.original.currentPriceUnit === "ton"
                    ? "цена в TON"
                    : undefined
              }
              tone={diff24hValid ? profitTone(diff24h) : "neutral"}
            />
          );
        },
      }),
      columnHelper.accessor(resolveInvestedSortValue, {
        id: "invested",
        header: ({ column }) => <DataTableSortHeader column={column} label="Invested (TON · USD)" />,
        cell: ({ row }) => (
          <MetricCell
            primary={row.original.totalInvested}
            secondary={
              row.original.hasIncompleteTonBasis || row.original.hasIncompleteUsdBasis
                ? "неполные ноги"
                : row.original.totalProceedsTon > 0 || row.original.totalProceedsUsd > 0
                  ? `proceeds ${formatTonUsdPair(
                      row.original.totalProceedsTon > 0 ? row.original.totalProceedsTon : null,
                      row.original.totalProceedsUsd > 0 ? row.original.totalProceedsUsd : null
                    )}`
                  : undefined
            }
            muted={row.original.hasIncompleteTonBasis || row.original.hasIncompleteUsdBasis}
          />
        ),
      }),
      columnHelper.accessor(row => row.avgBuyPriceUsd ?? row.avgBuyPriceTon ?? null, {
        id: "avgPrice",
        header: ({ column }) => <DataTableSortHeader column={column} label="Avg. price" />,
        sortingFn: createNullableNumberSortingFn("avgPrice"),
        sortUndefined: "last",
        cell: ({ row }) => (
          <MetricCell
            primary={row.original.avgBuyPrice}
            secondary={
              row.original.isTonNative
                ? "средняя цена TON на свапах"
                : row.original.holdingsRaw > 0n
                  ? "cost basis / остаток"
                  : "средняя по всем покупкам"
            }
          />
        ),
      }),
      columnHelper.accessor(resolvePnlSortValue, {
        id: "pnl",
        header: ({ column }) => <DataTableSortHeader column={column} label="PnL (TON · USD)" />,
        sortingFn: createNullableNumberSortingFn("pnl"),
        sortUndefined: "last",
        cell: ({ row }) => (
          <PnlAmountStack
            ton={row.original.currentProfitTon}
            usd={row.original.currentProfitUsd}
            percentTon={row.original.currentProfitPercentTon}
            percentUsd={row.original.currentProfitPercentUsd}
          />
        ),
      }),
      columnHelper.accessor(row => row.holdingsRaw, {
        id: "holdings",
        header: ({ column }) => <DataTableSortHeader column={column} label="Holdings (spot)" />,
        sortingFn: createBigintSortingFn("holdings"),
        cell: ({ row }) => (
          <MetricCell primary={row.original.holdingsValue} secondary={row.original.holdings} />
        ),
      }),
      columnHelper.display({
        id: "expand",
        header: " ",
        enableSorting: false,
        meta: { headerClassName: "text-right text-gray-400" },
        cell: ({ row }) => {
          const tradeCount = row.original.trades.length;
          const panelId = `${panelIdPrefix}-${row.id}`;

          if (tradeCount === 0) {
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
                {row.getIsExpanded() ? "Less" : `Deals (${tradeCount})`}
              </button>
            </div>
          );
        },
      }),
    ],
    [panelIdPrefix]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: row => row.original.trades.length > 0,
    getRowId: row => row.jetton.address,
  });

  const renderSubComponent = useCallback(
    (row: { original: JettonPortfolioPnlLine; id: string }) => (
      <div id={`${panelIdPrefix}-${row.id}`}>
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          Сделки {row.original.jetton.symbol} — TON и USD отдельно
        </p>
        <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
          {row.original.trades.map(trade => (
            <PortfolioTradeCard key={`${trade.swapId}-${trade.side}`} trade={trade} />
          ))}
        </ul>
      </div>
    ),
    [panelIdPrefix]
  );

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">Нет данных по jetton для PnL.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
      <DataTable
        table={table}
        tableClassName="min-w-[56rem] text-sm"
        theadClassName="bg-gray-50 text-left text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900/80"
        headerRowClassName="border-b border-gray-200 dark:border-gray-800"
        headerCellClassName="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-300"
        tbodyClassName="divide-y divide-gray-100 dark:divide-gray-800"
        getRowClassName={row =>
          cn(
            "border-b transition-colors",
            row.original.isTonNative
              ? "border-sky-300/90 bg-sky-100/50 hover:bg-sky-100/80 dark:border-sky-700 dark:bg-sky-950/40 dark:hover:bg-sky-950/60"
              : "border-sky-100/80 hover:bg-sky-50/40 dark:border-sky-900/40 dark:hover:bg-sky-950/20"
          )
        }
        bodyCellClassName="px-3 py-3"
        subRowClassName="bg-sky-50/50 dark:bg-sky-950/20"
        subRowCellClassName="px-3 py-3"
        renderSubComponent={renderSubComponent}
      />
    </div>
  );
}
