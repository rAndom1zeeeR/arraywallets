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
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
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
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("text-right text-sm", muted && "opacity-70")}>
      {primary && (
        <div
          className={cn(
            "font-medium tabular-nums",
            tone === "profit" && "text-profit",
            tone === "loss" && "text-loss",
            tone === "neutral" && "text-foreground"
          )}
        >
          {primary}
        </div>
      )}
      {secondary && <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{secondary}</div>}
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
    <li className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time className="text-xs text-muted-foreground" dateTime={trade.timestampIso}>
          {new Date(trade.timestampIso).toLocaleString()}
        </time>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-medium",
              trade.side === "sell" && "bg-loss/10 text-loss",
              trade.side === "buy" && "bg-profit/10 text-profit"
            )}
          >
            {trade.side === "buy" ? "Buy" : "Sell"}
          </span>
          {trade.dex && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{trade.dex}</span>
          )}
          {(trade.incompleteTon || trade.incompleteUsd) && (
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
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
              className="text-xs font-medium text-primary hover:underline"
            >
              Tonviewer ↗
            </a>
          )}
        </div>
      </div>

      <div className="mt-1.5 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <span className="text-xs text-muted-foreground">Amount</span>
          <div className="font-medium text-foreground">{trade.jettonAmount}</div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Unit price · Total</span>
          <div className="font-medium tabular-nums">
            {trade.unitPriceDisplay ?? "—"}
            {(trade.totalTonFormatted || trade.totalUsdFormatted) && (
              <span className="text-muted-foreground">
                {" "}
                · {formatTonUsdPair(trade.totalTon, trade.totalUsd) ?? "—"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <span className="text-xs text-muted-foreground">{trade.side === "buy" ? "Paid" : "Received"}</span>
        <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
          {trade.paymentLegs.map((leg, index) => (
            <li key={`${trade.swapId}-leg-${index}`} className="flex flex-wrap justify-between gap-2">
              <span>{leg.label}</span>
              <span className="font-medium tabular-nums text-foreground">{formatTonUsdPair(leg.ton, leg.usd) ?? "—"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">{LEG_KIND_LABELS[trade.legKind] ?? trade.legKind}</div>
    </li>
  );
}

const columnHelper = createColumnHelper<JettonPortfolioPnlLine>();

export function JettonPortfolioPnlTable({ rows }: JettonPortfolioPnlTableProps) {
  const panelIdPrefix = useId();
  const [sorting, setSorting] = useState<SortingState>([{ id: "pnl", desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.jetton.symbol.toLowerCase(), {
        id: "asset",
        header: ({ column }) => <DataTableSortHeader column={column} label="Asset" />,
        cell: ({ row }) => <JettonAssetCell jetton={row.original.jetton} />,
      }),
      columnHelper.accessor(resolvePriceSortValue, {
        id: "price",
        header: ({ column }) => <DataTableSortHeader column={column} label="Price / 24h" />,
        sortingFn: createNullableNumberSortingFn("price"),
        sortUndefined: "last",
        meta: { align: "right" },
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
        header: ({ column }) => <DataTableSortHeader column={column} label="Invested" />,
        meta: { align: "right", hideBelow: "md" },
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
        meta: { align: "right", hideBelow: "lg" },
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
        header: ({ column }) => <DataTableSortHeader column={column} label="Current profit" />,
        sortingFn: createNullableNumberSortingFn("pnl"),
        sortUndefined: "last",
        meta: { align: "right" },
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
        header: ({ column }) => <DataTableSortHeader column={column} label="Holdings" />,
        sortingFn: createBigintSortingFn("holdings"),
        meta: { align: "right", hideBelow: "sm" },
        cell: ({ row }) => (
          <MetricCell primary={row.original.holdingsValue} secondary={row.original.holdings} />
        ),
      }),
      columnHelper.display({
        id: "expand",
        header: " ",
        enableSorting: false,
        meta: { align: "right", headerClassName: "text-muted-foreground" },
        cell: ({ row }) => {
          const tradeCount = row.original.trades.length;
          const panelId = `${panelIdPrefix}-${row.id}`;

          if (tradeCount === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          return (
            <div className="text-right">
              <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                aria-expanded={row.getIsExpanded()}
                aria-controls={panelId}
                className={buttonStyles.ghost}
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
        <p className="mb-2 text-xs font-medium text-muted-foreground">
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
    return <p className="text-sm text-muted-foreground">Нет данных по jetton для PnL.</p>;
  }

  return (
    <DataTable
      table={table}
      tableClassName="min-w-[36rem] sm:min-w-[56rem]"
      renderSubComponent={renderSubComponent}
    />
  );
}
