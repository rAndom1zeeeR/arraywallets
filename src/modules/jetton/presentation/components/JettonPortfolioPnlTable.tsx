"use client";

import { useCallback, useId, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { JettonAssetCell } from "@/modules/jetton/presentation/components/JettonAssetCell";
import { PnlAmountStack } from "@/modules/jetton/presentation/components/PnlAmountStack";
import type { JettonPortfolioPnlLine, PortfolioTradeDetail } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import {
  formatMoneyJetton,
  formatPercentChange24h,
  formatTonAmount,
  formatTonPrice,
  formatTonUsdPair,
  formatUsd,
  formatUsdUnitPrice,
} from "@/modules/jetton/domain/money-format.utils";
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
  /** When set, sorting applies to the full dataset and rows are paginated client-side. */
  pageIndex?: number;
  pageSize?: number;
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

function formatLineInvested(line: JettonPortfolioPnlLine): string | null {
  if (line.totalInvestedTon > 0) {
    return formatTonAmount(line.totalInvestedTon);
  }
  if (line.totalInvestedUsd > 0) {
    return formatUsd(line.totalInvestedUsd);
  }
  return null;
}

function formatLineHoldingsQuantity(line: JettonPortfolioPnlLine): string | null {
  if (line.holdingsRaw === 0n) {
    return null;
  }
  return formatMoneyJetton(line.holdingsRaw, line.jetton.decimals, line.jetton.symbol);
}

function formatLineHoldingsValue(line: JettonPortfolioPnlLine): string | null {
  if (line.holdingsValueTon !== null && line.holdingsValueTon !== undefined) {
    return formatTonAmount(line.holdingsValueTon);
  }
  if (line.holdingsValueUsd !== null && line.holdingsValueUsd !== undefined) {
    return formatUsd(line.holdingsValueUsd);
  }
  return null;
}

function formatLineAvgPrice(line: JettonPortfolioPnlLine): string | null {
  if (line.avgBuyPriceUsd !== null && line.avgBuyPriceUsd !== undefined) {
    return formatUsdUnitPrice(line.avgBuyPriceUsd);
  }
  if (line.avgBuyPriceTon !== null && line.avgBuyPriceTon !== undefined) {
    return formatTonPrice(line.avgBuyPriceTon);
  }
  return null;
}

function formatLineSpotPrice(line: JettonPortfolioPnlLine): string | null {
  if (line.currentPriceUsd !== null && line.currentPriceUsd !== undefined && line.currentPriceUsd > 0) {
    const usd = formatUsdUnitPrice(line.currentPriceUsd);
    const ton =
      line.currentPriceTon !== null && line.currentPriceTon !== undefined && line.currentPriceTon > 0
        ? formatTonPrice(line.currentPriceTon)
        : null;
    return ton && usd ? `${usd} · ${ton}` : usd;
  }
  if (line.currentPriceTon !== null && line.currentPriceTon !== undefined) {
    return formatTonPrice(line.currentPriceTon);
  }
  return null;
}

function formatLinePriceChange24h(line: JettonPortfolioPnlLine): string | null {
  const diffRaw = line.jetton.price?.diff24hUsd;
  if (diffRaw === null || diffRaw === undefined) {
    return null;
  }
  const diff = Number.parseFloat(diffRaw.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(diff) ? formatPercentChange24h(diff) : null;
}

function formatLineProceeds(line: JettonPortfolioPnlLine): string | null {
  return formatTonUsdPair(
    line.totalProceedsTon > 0 ? line.totalProceedsTon : null,
    line.totalProceedsUsd > 0 ? line.totalProceedsUsd : null
  );
}

interface PortfolioTradeCardProps {
  trade: PortfolioTradeDetail;
  jettonDecimals: number;
  jettonSymbol: string;
}

function PortfolioTradeCard({ trade, jettonDecimals, jettonSymbol }: PortfolioTradeCardProps) {
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
          <div className="font-medium text-foreground">
            {formatMoneyJetton(trade.jettonAmountRaw, jettonDecimals, jettonSymbol)}
          </div>
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

export function JettonPortfolioPnlTable({ rows, pageIndex, pageSize }: JettonPortfolioPnlTableProps) {
  const panelIdPrefix = useId();
  const [sorting, setSorting] = useState<SortingState>([{ id: "pnl", desc: true }]);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const isPaginated = pageSize !== undefined && pageSize > 0;

  const toggleExpandedRow = useCallback((rowId: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

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
          const priceChange24h = formatLinePriceChange24h(row.original);

          return (
            <MetricCell
              primary={formatLineSpotPrice(row.original)}
              secondary={
                priceChange24h ??
                (row.original.currentPriceUnit === "ton" ? "цена в TON" : undefined)
              }
              tone={diff24hValid ? profitTone(diff24h) : "neutral"}
            />
          );
        },
      }),
      columnHelper.accessor(resolveInvestedSortValue, {
        id: "invested",
        header: ({ column }) => <DataTableSortHeader column={column} label="Invested" />,
        sortingFn: createNullableNumberSortingFn("invested"),
        meta: { align: "right", hideBelow: "md" },
        cell: ({ row }) => {
          const proceedsText = formatLineProceeds(row.original);

          return (
          <MetricCell
            primary={formatLineInvested(row.original)}
            secondary={
              row.original.hasIncompleteTonBasis || row.original.hasIncompleteUsdBasis
                ? "неполные ноги"
                : proceedsText
                  ? `proceeds ${proceedsText}`
                  : undefined
            }
            muted={row.original.hasIncompleteTonBasis || row.original.hasIncompleteUsdBasis}
          />
          );
        },
      }),
      columnHelper.accessor(row => row.avgBuyPriceUsd ?? row.avgBuyPriceTon ?? null, {
        id: "avgPrice",
        header: ({ column }) => <DataTableSortHeader column={column} label="Avg. price" />,
        sortingFn: createNullableNumberSortingFn("avgPrice"),
        sortUndefined: "last",
        meta: { align: "right", hideBelow: "lg" },
        cell: ({ row }) => (
          <MetricCell
            primary={formatLineAvgPrice(row.original)}
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
          <MetricCell
            primary={formatLineHoldingsValue(row.original)}
            secondary={formatLineHoldingsQuantity(row.original) ?? undefined}
          />
        ),
      }),
      columnHelper.display({
        id: "expand",
        header: " ",
        enableSorting: false,
        meta: { align: "right", headerClassName: "text-muted-foreground" },
        cell: ({ row, table }) => {
          const tradeCount = row.original.trades.length;
          const panelId = `${panelIdPrefix}-${row.id}`;
          const expandMeta = table.options.meta?.expand;

          if (tradeCount === 0) {
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
                {isExpanded ? "Less" : `Deals (${tradeCount})`}
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
    meta: {
      expand: {
        expandedRowIds,
        toggleExpandedRow,
      },
    },
    initialState: {
      sorting: [{ id: "pnl", desc: true }],
      ...(isPaginated
        ? { pagination: { pageIndex: pageIndex ?? 0, pageSize } }
        : {}),
    },
    state: {
      sorting,
      ...(isPaginated
        ? { pagination: { pageIndex: pageIndex ?? 0, pageSize } }
        : {}),
    },
    onSortingChange: setSorting,
    enableSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isPaginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
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
            <PortfolioTradeCard
              key={`${trade.swapId}-${trade.side}`}
              trade={trade}
              jettonDecimals={row.original.jetton.decimals}
              jettonSymbol={row.original.jetton.symbol}
            />
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
      isRowExpanded={row => expandedRowIds[row.id] ?? false}
      renderSubComponent={renderSubComponent}
    />
  );
}
