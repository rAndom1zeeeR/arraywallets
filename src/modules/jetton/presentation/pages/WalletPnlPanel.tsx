"use client";

import { Suspense } from "react";
import {
  JETTON_PNL_PAGE_SIZE,
  JettonPnlPagination,
} from "@/modules/jetton/presentation/components/JettonPnlPagination";
import { BaseAssetSwapPnlSection } from "@/modules/jetton/presentation/components/BaseAssetSwapPnlSection";
import { TonPureTransfersSection } from "@/modules/jetton/presentation/components/TonPureTransfersSection";
import { JettonPortfolioPnlTable } from "@/modules/jetton/presentation/components/JettonPortfolioPnlTable";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import { DataTableShell } from "@/shared/presentation/components/data-table/data-table-shell";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

export interface WalletPnlPanelProps {
  address: string;
  currentPage: number;
  stats: WalletSwapStatsResult;
}

export function WalletPnlPanel({ address, currentPage, stats }: WalletPnlPanelProps) {
  const { portfolio, pnl, tonPortfolio, usdtPortfolio, aggregate, tonPnlWithTransfers, tonTransfers } = stats;

  const totalJettons = portfolio.length;
  const totalPages = Math.max(1, Math.ceil(totalJettons / JETTON_PNL_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const hasUsdtFlow = pnl.usdt.spentRaw > 0n || pnl.usdt.receivedRaw > 0n;

  return (
    <div
      id="wallet-tabpanel-pnl"
      role="tabpanel"
      aria-labelledby="wallet-tab-pnl"
      className="space-y-6"
    >
      <BaseAssetSwapPnlSection
        title="PnL TON (incl. pTON)"
        subtitle="Swaps + pure TON transfers (excluding swap events). Total PnL includes withdrawn TON."
        flowPnl={pnl.ton}
        portfolioLine={tonPortfolio}
        currency="ton"
        swapCount={aggregate.swapCount}
        tonPnlWithTransfers={tonPnlWithTransfers}
      />

      {hasUsdtFlow ? (
        <BaseAssetSwapPnlSection
          title={`PnL ${usdtPortfolio?.jetton.symbol ?? "USDT"}`}
          subtitle="USDT / jUSDT on swaps — USD only, not mixed with TON."
          flowPnl={pnl.usdt}
          portfolioLine={usdtPortfolio}
          currency="usd"
          swapCount={aggregate.swapCount}
        />
      ) : (
        <section className={cn(pageStyles.section, "border-dashed")}>
          <h2 className={pageStyles.sectionTitle}>PnL USDT</h2>
          <p className={pageStyles.sectionSubtitle}>No swaps with USDT / jUSDT / USD₮ in wallet data.</p>
        </section>
      )}

      {portfolio.length > 0 && (
        <DataTableShell
          title="Your Assets"
          subtitle={`TON and USD legs separately · ${totalJettons} tokens`}
        >
          {totalJettons > JETTON_PNL_PAGE_SIZE && (
            <div className="mb-4">
              <JettonPnlPagination
                address={address}
                currentPage={safePage}
                totalPages={totalPages}
                totalJettons={totalJettons}
              />
            </div>
          )}

          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <JettonPortfolioPnlTable
              rows={portfolio}
              pageIndex={safePage - 1}
              pageSize={JETTON_PNL_PAGE_SIZE}
            />
          </Suspense>

          {totalJettons > JETTON_PNL_PAGE_SIZE && (
            <div className="mt-4">
              <JettonPnlPagination
                address={address}
                currentPage={safePage}
                totalPages={totalPages}
                totalJettons={totalJettons}
              />
            </div>
          )}
        </DataTableShell>
      )}

      <TonPureTransfersSection transfers={tonTransfers} />
    </div>
  );
}
