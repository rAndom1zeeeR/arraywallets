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
import {
  formatMoneyJetton,
  formatMoneyTonFromNanoton,
} from "@/modules/jetton/domain/money-format.utils";
import type { JettonRelatedSwapItem } from "@/modules/swap/domain/swap-transaction-list.utils";
import type { JettonSwapBreakdownFormatted } from "@/modules/swap/domain/swap-stats.utils";
import { RelatedSwapsPanel } from "@/modules/swap/presentation/components/SwapJettonTable";
import {
  MobileList,
  MobileListBody,
  MobileListIcon,
  MobileListItem,
} from "@/shared/presentation/components/mobile-list/mobile-list";
import { mobileListStyles } from "@/shared/presentation/components/mobile-list/mobile-list.styles";
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
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
        <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Failed to refresh prices — showing cached DB data (if available).
        </p>
      )}
      <MobileList aria-label="Swap breakdown by jetton">
        {rows.map(row => {
          const rowId = row.jetton.address;
          const relatedSwaps = relatedByJetton[row.jetton.address.toLowerCase()] ?? [];
          const isExpanded = expandedRowIds[rowId] ?? false;
          const panelId = `${panelIdPrefix}-${rowId}`;
          const rate =
            row.jetton.price ?? getJettonRateQuote(rates, row.jetton.address);

          return (
            <MobileListItem key={rowId}>
              <MobileListIcon>
                <Coins className="size-4" aria-hidden />
              </MobileListIcon>
              <MobileListBody>
                <div className="flex items-start justify-between gap-2">
                  <JettonAssetCell jetton={row.jetton} />
                  <div className="text-right text-xs">
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
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Sold</span>
                    <div className="font-medium tabular-nums text-loss">
                      {formatMoneyJetton(row.spentRaw, row.jetton.decimals, row.jetton.symbol)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Bought</span>
                    <div className="font-medium tabular-nums text-profit">
                      {formatMoneyJetton(row.receivedRaw, row.jetton.decimals, row.jetton.symbol)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TON got</span>
                    <div className="font-medium tabular-nums text-profit">
                      {formatMoneyTonFromNanoton(row.tonReceivedNanoton)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">TON paid</span>
                    <div className="font-medium tabular-nums text-loss">
                      {formatMoneyTonFromNanoton(row.tonPaidNanoton)}
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  sell {row.legsIn} · buy {row.legsOut}
                </p>
                {relatedSwaps.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => toggleExpandedRow(rowId)}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className={cn(buttonStyles.ghost, "w-full justify-center")}
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
              </MobileListBody>
            </MobileListItem>
          );
        })}
      </MobileList>
    </div>
  );
}
