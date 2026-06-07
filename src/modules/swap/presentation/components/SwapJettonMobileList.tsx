"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { JettonAssetCell } from "@/modules/jetton/presentation/components/JettonAssetCell";
import { JettonPriceCell } from "@/modules/jetton/presentation/components/JettonPriceCell";
import { hasDisplayableJettonPrice } from "@/modules/jetton/domain/jetton-price.utils";
import {
  getJettonRateQuote,
  useJettonRates,
} from "@/modules/jetton/presentation/hooks/use-jetton-rates";
import { formatMoneyJetton } from "@/modules/jetton/domain/money-format.utils";
import { SwapJettonMergedFlowMobileBlock } from "@/modules/swap/presentation/components/swap-jetton-flow-cell";
import type { JettonRelatedSwapItem } from "@/modules/swap/domain/swap-transaction-list.utils";
import type { JettonSwapBreakdownFormatted } from "@/modules/swap/domain/swap-stats.utils";
import { RelatedSwapsPanel } from "@/modules/swap/presentation/components/SwapJettonTable";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface SwapJettonMobileListProps {
  rows: JettonSwapBreakdownFormatted[];
  relatedByJetton: Record<string, JettonRelatedSwapItem[]>;
}

export function SwapJettonMobileList({ rows, relatedByJetton }: SwapJettonMobileListProps) {
  const panelIdPrefix = useId();
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

  return (
    <div>
      {needsLiveRates && isRatesError && (
        <p className="mx-4 mb-3 rounded-lg border border-chart-5/30 bg-chart-5/10 px-3 py-2 text-xs text-chart-5">
          Failed to refresh prices — showing cached DB data (if available).
        </p>
      )}
      <div role="list" aria-label="Swap breakdown by jetton">
        {rows.map(row => {
          const rowId = row.jetton.address;
          const relatedSwaps = relatedByJetton[row.jetton.address.toLowerCase()] ?? [];
          const isExpanded = expandedRowIds[rowId] ?? false;
          const panelId = `${panelIdPrefix}-${rowId}`;
          const rate = row.jetton.price ?? getJettonRateQuote(rates, row.jetton.address);

          return (
            <div
              key={rowId}
              className="border-b border-border bg-background px-4 py-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(explorerStyles.directionIcon, "mt-0.5 size-9")}
                  aria-hidden
                >
                  <Coins className="size-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <JettonAssetCell jetton={row.jetton} />
                    <div className="shrink-0 text-right text-xs">
                      <JettonPriceCell
                        rate={rate}
                        isLoading={
                          needsLiveRates &&
                          !hasDisplayableJettonPrice(row.jetton.price) &&
                          isRatesLoading
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Sold</span>
                      <div className="font-semibold tabular-nums text-loss">
                        {formatMoneyJetton(row.spentRaw, row.jetton.decimals, row.jetton.symbol)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">Bought</span>
                      <div className="font-semibold tabular-nums text-profit">
                        {formatMoneyJetton(row.receivedRaw, row.jetton.decimals, row.jetton.symbol)}
                      </div>
                    </div>
                    <SwapJettonMergedFlowMobileBlock
                      title="Received"
                      tonNanoton={row.tonReceivedNanoton}
                      otherText={row.counterpartsReceivedText}
                      tone="profit"
                    />
                    <SwapJettonMergedFlowMobileBlock
                      title="Spent"
                      tonNanoton={row.tonPaidNanoton}
                      otherText={row.counterpartsPaidText}
                      tone="loss"
                      align="right"
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    sell {row.legsIn} · buy {row.legsOut}
                  </p>

                  {relatedSwaps.length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleExpandedRow(rowId)}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        className="w-full rounded-lg border border-border bg-explorer-surface-2 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {isExpanded ? "Hide swaps" : `Swaps (${relatedSwaps.length})`}
                      </button>
                      {isExpanded && (
                        <div id={panelId} className="mt-2">
                          <RelatedSwapsPanel
                            jettonSymbol={row.jetton.symbol}
                            relatedSwaps={relatedSwaps}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
