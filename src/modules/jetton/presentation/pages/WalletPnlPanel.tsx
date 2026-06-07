"use client";

import { useMemo } from "react";
import {
  JETTON_PNL_PAGE_SIZE,
  JettonPnlPagination,
} from "@/modules/jetton/presentation/components/JettonPnlPagination";
import { WalletPnlSummaryCards } from "@/modules/jetton/presentation/components/wallet-pnl-summary-cards";
import { WalletPnlTradesTable } from "@/modules/jetton/presentation/components/wallet-pnl-trades-table";
import { WalletPnlUsdtNotice } from "@/modules/jetton/presentation/components/wallet-pnl-usdt-notice";
import { formatUsd } from "@/modules/jetton/domain/money-format.utils";
import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";

export interface WalletPnlPanelProps {
  address: string;
  currentPage: number;
  stats: WalletSwapStatsResult;
}

function buildTradeRows(
  tonPortfolio: JettonPortfolioPnlLine | null,
  portfolio: JettonPortfolioPnlLine[],
  pageIndex: number,
  pageSize: number
): JettonPortfolioPnlLine[] {
  const tonKey = tonPortfolio?.jetton.address.toLowerCase();
  const jettonRows = portfolio.filter(
    row => !tonKey || row.jetton.address.toLowerCase() !== tonKey
  );

  const totalPages = Math.max(1, Math.ceil(jettonRows.length / pageSize));
  const safePage = Math.min(Math.max(1, pageIndex), totalPages);
  const pagedJettons = jettonRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const rows: JettonPortfolioPnlLine[] = [];
  if (tonPortfolio) {
    rows.push(tonPortfolio);
  }
  rows.push(...pagedJettons);

  return rows;
}

export function WalletPnlPanel({ address, currentPage, stats }: WalletPnlPanelProps) {
  const { portfolio, pnl, tonPortfolio, usdtPortfolio, tonPnlWithTransfers } = stats;

  const hasUsdtFlow = pnl.usdt.spentRaw > 0n || pnl.usdt.receivedRaw > 0n;
  const jettonCount = portfolio.filter(
    row => !tonPortfolio || row.jetton.address.toLowerCase() !== tonPortfolio.jetton.address.toLowerCase()
  ).length;
  const totalPages = Math.max(1, Math.ceil(jettonCount / JETTON_PNL_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const tradeRows = useMemo(
    () => buildTradeRows(tonPortfolio, portfolio, safePage, JETTON_PNL_PAGE_SIZE),
    [tonPortfolio, portfolio, safePage]
  );

  return (
    <div
      id="wallet-tabpanel-pnl"
      role="tabpanel"
      aria-labelledby="wallet-tab-pnl"
      className="space-y-4"
    >
      <WalletPnlSummaryCards flowPnl={pnl.ton} tonPnlWithTransfers={tonPnlWithTransfers} />

      <WalletPnlTradesTable rows={tradeRows} />

      {jettonCount > JETTON_PNL_PAGE_SIZE ? (
        <JettonPnlPagination
          address={address}
          currentPage={safePage}
          totalPages={totalPages}
          totalJettons={jettonCount}
        />
      ) : null}

      {hasUsdtFlow && usdtPortfolio ? (
        <section className="rounded-xl border border-border bg-explorer-surface px-4 py-3 text-sm text-muted-foreground">
          PnL {usdtPortfolio.jetton.symbol}:{" "}
          <span className="text-foreground tabular-nums">
            {formatUsd(usdtPortfolio.currentProfitUsd) ?? "—"}
          </span>
        </section>
      ) : (
        <WalletPnlUsdtNotice symbol={usdtPortfolio?.jetton.symbol ?? "USDT"} />
      )}
    </div>
  );
}
