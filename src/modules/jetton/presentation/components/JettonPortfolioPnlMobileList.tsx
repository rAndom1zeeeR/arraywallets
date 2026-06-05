"use client";

import { useCallback, useId, useState } from "react";
import { TrendingUp } from "lucide-react";
import { JettonAssetCell } from "@/modules/jetton/presentation/components/JettonAssetCell";
import { PnlAmountStack } from "@/modules/jetton/presentation/components/PnlAmountStack";
import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import {
  formatMoneyJetton,
  formatPercentChange24h,
  formatTonAmount,
  formatTonPrice,
  formatTonUsdPair,
  formatUsd,
  formatUsdUnitPrice,
} from "@/modules/jetton/domain/money-format.utils";
import { PortfolioTradeCard } from "@/modules/jetton/presentation/components/portfolio-trade-card";
import {
  MobileList,
  MobileListBody,
  MobileListIcon,
  MobileListItem,
} from "@/shared/presentation/components/mobile-list/mobile-list";
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

interface JettonPortfolioPnlMobileListProps {
  rows: JettonPortfolioPnlLine[];
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

function formatLineHoldingsValue(line: JettonPortfolioPnlLine): string | null {
  if (line.holdingsValueTon !== null && line.holdingsValueTon !== undefined) {
    return formatTonAmount(line.holdingsValueTon);
  }
  if (line.holdingsValueUsd !== null && line.holdingsValueUsd !== undefined) {
    return formatUsd(line.holdingsValueUsd);
  }
  return null;
}

function formatLineSpotPrice(line: JettonPortfolioPnlLine): string | null {
  if (line.currentPriceUsd !== null && line.currentPriceUsd !== undefined && line.currentPriceUsd > 0) {
    return formatUsdUnitPrice(line.currentPriceUsd);
  }
  if (line.currentPriceTon !== null && line.currentPriceTon !== undefined) {
    return formatTonPrice(line.currentPriceTon);
  }
  return null;
}

export function JettonPortfolioPnlMobileList({ rows }: JettonPortfolioPnlMobileListProps) {
  const panelIdPrefix = useId();
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  const toggleExpandedRow = useCallback((rowId: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No jetton data for PnL.</p>;
  }

  return (
    <MobileList aria-label="Portfolio PnL by jetton">
      {rows.map(row => {
        const rowId = row.jetton.address;
        const isExpanded = expandedRowIds[rowId] ?? false;
        const panelId = `${panelIdPrefix}-${rowId}`;
        const diff24hRaw = row.jetton.price?.diff24hUsd;
        const diff24h =
          diff24hRaw !== null && diff24hRaw !== undefined ? Number.parseFloat(diff24hRaw) : null;
        const priceChange24h =
          diff24h !== null && Number.isFinite(diff24h) ? formatPercentChange24h(diff24h) : null;

        return (
          <MobileListItem key={rowId}>
            <MobileListIcon>
              <TrendingUp className="size-4" aria-hidden />
            </MobileListIcon>
            <MobileListBody>
              <div className="flex items-start justify-between gap-2">
                <JettonAssetCell jetton={row.jetton} />
                <PnlAmountStack
                  ton={row.currentProfitTon}
                  usd={row.currentProfitUsd}
                  percentTon={row.currentProfitPercentTon}
                  percentUsd={row.currentProfitPercentUsd}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Price</span>
                  <div className="font-medium tabular-nums">{formatLineSpotPrice(row) ?? "—"}</div>
                  {priceChange24h && (
                    <div className="text-muted-foreground">{priceChange24h}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Holdings</span>
                  <div className="font-medium tabular-nums">{formatLineHoldingsValue(row) ?? "—"}</div>
                  {row.holdingsRaw > 0n && (
                    <div className="text-muted-foreground">
                      {formatMoneyJetton(row.holdingsRaw, row.jetton.decimals, row.jetton.symbol)}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Invested</span>
                  <div className="font-medium tabular-nums">{formatLineInvested(row) ?? "—"}</div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Proceeds</span>
                  <div className="font-medium tabular-nums">
                    {formatTonUsdPair(
                      row.totalProceedsTon > 0 ? row.totalProceedsTon : null,
                      row.totalProceedsUsd > 0 ? row.totalProceedsUsd : null
                    ) ?? "—"}
                  </div>
                </div>
              </div>
              {row.trades.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => toggleExpandedRow(rowId)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className={cn(buttonStyles.ghost, "w-full justify-center")}
                  >
                    {isExpanded ? "Hide trades" : `Trades (${row.trades.length})`}
                  </button>
                  {isExpanded && (
                    <ul id={panelId} className="mt-2 max-h-80 space-y-2 overflow-y-auto text-sm">
                      {row.trades.map(trade => (
                        <PortfolioTradeCard
                          key={`${trade.swapId}-${trade.side}`}
                          trade={trade}
                          jettonDecimals={row.jetton.decimals}
                          jettonSymbol={row.jetton.symbol}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </MobileListBody>
          </MobileListItem>
        );
      })}
    </MobileList>
  );
}
