"use client";

import { useCallback, useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { JettonAssetCell } from "@/modules/jetton/presentation/components/JettonAssetCell";
import { PortfolioTradeCard } from "@/modules/jetton/presentation/components/portfolio-trade-card";
import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import {
  formatTonAmount,
  formatTonPrice,
  formatUsd,
  formatUsdUnitPrice,
} from "@/modules/jetton/domain/money-format.utils";
import { pnlClassNameFromNumber } from "@/modules/jetton/domain/pnl-display.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletPnlTradesTableProps {
  rows: JettonPortfolioPnlLine[];
}

function formatLineAvgPrice(line: JettonPortfolioPnlLine): string {
  if (line.avgBuyPriceTon !== null && line.avgBuyPriceTon !== undefined) {
    return formatTonPrice(line.avgBuyPriceTon) ?? "—";
  }

  if (line.avgBuyPriceUsd !== null && line.avgBuyPriceUsd !== undefined) {
    return formatUsdUnitPrice(line.avgBuyPriceUsd) ?? "—";
  }

  if (line.isTonNative) {
    return "1.00 TON";
  }

  return "—";
}

function formatLineInvested(line: JettonPortfolioPnlLine): string {
  if (line.hasIncompleteTonBasis || line.hasIncompleteUsdBasis) {
    return "incomplete legs";
  }

  if (line.totalInvestedTon > 0) {
    return formatTonAmount(line.totalInvestedTon) ?? "—";
  }

  if (line.totalInvestedUsd > 0) {
    return formatUsd(line.totalInvestedUsd) ?? "—";
  }

  return "—";
}

function formatLineProfit(line: JettonPortfolioPnlLine): string {
  const value = line.currentProfitTon ?? line.currentProfitUsd;
  const formatted =
    line.currentProfitTon !== null && line.currentProfitTon !== undefined
      ? formatTonAmount(line.currentProfitTon)
      : line.currentProfitUsd !== null && line.currentProfitUsd !== undefined
        ? formatUsd(line.currentProfitUsd)
        : null;

  if (!formatted) {
    return "—";
  }

  if (value !== null && value !== undefined && value > 0 && !formatted.startsWith("+")) {
    return `+${formatted}`;
  }

  return formatted;
}

export function WalletPnlTradesTable({ rows }: WalletPnlTradesTableProps) {
  const panelIdPrefix = useId();
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  const totalTrades = rows.reduce((sum, row) => sum + row.trades.length, 0);

  const handleToggleRow = useCallback((rowId: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className={explorerStyles.card} aria-label={`Trades (${totalTrades})`}>
      <div className={explorerStyles.cardHeader}>
        <span className="text-sm font-semibold text-foreground">Trades ({totalTrades})</span>
      </div>

      <div className={explorerStyles.tableScroll}>
        <div className={explorerStyles.tableMinWidth}>
          <div
            className="grid grid-cols-[minmax(10rem,2fr)_minmax(5rem,1fr)_minmax(6rem,1.2fr)_minmax(5rem,1fr)_4rem] border-b border-border px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            role="row"
          >
            <span role="columnheader">Asset</span>
            <span role="columnheader" className="text-right">
              Avg. Price
            </span>
            <span role="columnheader" className="text-right">
              Invested
            </span>
            <span role="columnheader" className="text-right">
              Profit
            </span>
            <span role="columnheader" className="text-right">
              Deals
            </span>
          </div>

          {rows.map(row => {
            const rowId = row.jetton.address;
            const tradeCount = row.trades.length;
            const isExpanded = expandedRowIds[rowId] ?? false;
            const panelId = `${panelIdPrefix}-${rowId}`;
            const profitValue = row.currentProfitTon ?? row.currentProfitUsd;

            return (
              <div key={rowId} className="border-b border-border last:border-0">
                <div
                  className="grid grid-cols-[minmax(10rem,2fr)_minmax(5rem,1fr)_minmax(6rem,1.2fr)_minmax(5rem,1fr)_4rem] items-center px-4 py-3 transition-colors hover:bg-explorer-surface-2/40"
                  role="row"
                >
                  <div role="cell" className="min-w-0">
                    <JettonAssetCell jetton={row.jetton} />
                  </div>
                  <div role="cell" className="text-right text-sm tabular-nums text-foreground">
                    {formatLineAvgPrice(row)}
                  </div>
                  <div
                    role="cell"
                    className={cn(
                      "text-right text-sm tabular-nums",
                      row.hasIncompleteTonBasis || row.hasIncompleteUsdBasis
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {formatLineInvested(row)}
                  </div>
                  <div
                    role="cell"
                    className={cn(
                      "text-right text-sm font-semibold tabular-nums",
                      pnlClassNameFromNumber(profitValue)
                    )}
                  >
                    {formatLineProfit(row)}
                  </div>
                  <div role="cell" className="text-right">
                    {tradeCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRow(rowId)}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span className="tabular-nums">{tradeCount}</span>
                        <ChevronRight
                          className={cn("size-4 transition-transform", isExpanded && "rotate-90")}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {isExpanded && tradeCount > 0 ? (
                  <div id={panelId} className="border-t border-border bg-explorer-surface-2/30 px-4 py-4 sm:px-5">
                    <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                      {row.trades.map(trade => (
                        <PortfolioTradeCard
                          key={`${trade.swapId}-${trade.side}`}
                          trade={trade}
                          jettonDecimals={row.jetton.decimals}
                          jettonSymbol={row.jetton.symbol}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
