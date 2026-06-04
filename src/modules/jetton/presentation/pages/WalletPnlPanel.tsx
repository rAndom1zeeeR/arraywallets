"use client";

import { Suspense, useMemo } from "react";
import {
  JETTON_PNL_PAGE_SIZE,
  JettonPnlPagination,
} from "@/modules/jetton/presentation/components/JettonPnlPagination";
import { BaseAssetSwapPnlSection } from "@/modules/jetton/presentation/components/BaseAssetSwapPnlSection";
import { JettonPortfolioPnlTable } from "@/modules/jetton/presentation/components/JettonPortfolioPnlTable";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";

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
  const sliceStart = (safePage - 1) * JETTON_PNL_PAGE_SIZE;
  const visibleRows = useMemo(
    () => portfolio.slice(sliceStart, sliceStart + JETTON_PNL_PAGE_SIZE),
    [portfolio, sliceStart]
  );

  const hasUsdtFlow = pnl.usdt.spentRaw > 0n || pnl.usdt.receivedRaw > 0n;

  return (
    <div
      id="wallet-tabpanel-pnl"
      role="tabpanel"
      aria-labelledby="wallet-tab-pnl"
      className="space-y-4"
    >
      <BaseAssetSwapPnlSection
        title="PnL TON (incl. pTON)"
        subtitle="Свапы + чистые переводы TON (без свап-событий). Итоговый PnL включает выведенные TON."
        flowPnl={pnl.ton}
        portfolioLine={tonPortfolio}
        currency="ton"
        swapCount={aggregate.swapCount}
        tonPnlWithTransfers={tonPnlWithTransfers}
        tonTransfers={tonTransfers}
      />

      {hasUsdtFlow ? (
        <BaseAssetSwapPnlSection
          title={`PnL ${usdtPortfolio?.jetton.symbol ?? "USDT"}`}
          subtitle="USDT / jUSDT на свапах — только в USD, без смешивания с TON."
          flowPnl={pnl.usdt}
          portfolioLine={usdtPortfolio}
          currency="usd"
          swapCount={aggregate.swapCount}
        />
      ) : (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white/50 p-4 dark:border-gray-600 dark:bg-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">PnL USDT</h2>
          <p className="mt-2 text-sm text-gray-500">Нет свапов с USDT / jUSDT / USD₮ в данных кошелька.</p>
        </section>
      )}

      {portfolio.length > 0 && (
        <section className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
          <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">Другие jetton</h2>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            TON-ноги и USD-ноги в таблице показываются отдельно, без суммирования в одну валюту · {totalJettons}{" "}
            tokens
          </p>

          {totalJettons > JETTON_PNL_PAGE_SIZE && (
            <div className="mt-3">
              <JettonPnlPagination
                address={address}
                currentPage={safePage}
                totalPages={totalPages}
                totalJettons={totalJettons}
              />
            </div>
          )}

          <Suspense fallback={<p className="mt-3 text-sm text-gray-500">Загрузка…</p>}>
            <div className="mt-3">
              <JettonPortfolioPnlTable rows={visibleRows} />
            </div>
          </Suspense>

          {totalJettons > JETTON_PNL_PAGE_SIZE && (
            <div className="mt-3">
              <JettonPnlPagination
                address={address}
                currentPage={safePage}
                totalPages={totalPages}
                totalJettons={totalJettons}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
