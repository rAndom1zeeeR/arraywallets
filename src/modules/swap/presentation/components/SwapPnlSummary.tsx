import {
  JETTON_PNL_PAGE_SIZE,
  JettonPnlPagination,
} from "@/modules/jetton/presentation/components/JettonPnlPagination";
import type { PortfolioPnlTotals } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import { formatTonAmount, formatTonUsdPair, formatUsd } from "@/modules/jetton/domain/money-format.utils";
import { pnlClassNameFromBigint, pnlClassNameFromNumber } from "@/modules/jetton/domain/pnl-display.utils";
import type { SwapPnlSummary as SwapPnlSummaryData } from "@/modules/swap/domain/swap-pnl.utils";
import { SwapJettonPnlLinesTable } from "@/modules/swap/presentation/components/SwapJettonPnlLinesTable";
import { cn } from "@/shared/lib/utils";

interface SwapPnlSummaryProps {
  address: string;
  currentPage: number;
  pnl: SwapPnlSummaryData;
  portfolioTotals?: PortfolioPnlTotals;
  /** When false, only TON/USDT cards — jetton breakdown is shown separately (PnL tab). */
  showJettonLines?: boolean;
}

interface PnlCardProps {
  label: string;
  spent: string;
  received: string;
  net: string;
  netRaw: bigint;
}

function PnlCard({ label, spent, received, net, netRaw }: PnlCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/90 p-3 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Spent</div>
          <div className="font-medium text-red-600 dark:text-red-400">{spent}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Received</div>
          <div className="font-medium text-green-600 dark:text-green-400">{received}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Net PnL</div>
          <div
            className={cn("font-semibold", pnlClassNameFromBigint(netRaw))}
          >
            {net}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SwapPnlSummary({
  address,
  currentPage,
  pnl,
  portfolioTotals,
  showJettonLines = true,
}: SwapPnlSummaryProps) {
  const hasUsdtActivity = pnl.usdt.spentRaw > 0n || pnl.usdt.receivedRaw > 0n;
  const totalJettons = pnl.jettonLines.length;
  const totalPages = Math.max(1, Math.ceil(totalJettons / JETTON_PNL_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const sliceStart = (safePage - 1) * JETTON_PNL_PAGE_SIZE;
  const visibleJettonLines = pnl.jettonLines.slice(sliceStart, sliceStart + JETTON_PNL_PAGE_SIZE);

  return (
    <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
      <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">Swap PnL (all deals)</h2>
      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
        TON (incl. pTON) and USDT are counted separately. Detailed PnL per asset is on the PnL tab.
      </p>

      {portfolioTotals &&
        (portfolioTotals.totalInvestedTon > 0 || portfolioTotals.totalInvestedUsd > 0) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-sky-300/80 bg-white/90 p-3 dark:border-sky-800 dark:bg-gray-900/90">
              <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">Invested</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {formatTonUsdPair(
                  portfolioTotals.totalInvestedTon > 0 ? portfolioTotals.totalInvestedTon : null,
                  portfolioTotals.totalInvestedUsd > 0 ? portfolioTotals.totalInvestedUsd : null
                ) ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border border-sky-300/80 bg-white/90 p-3 dark:border-sky-800 dark:bg-gray-900/90">
              <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">Holdings (spot)</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {formatTonUsdPair(
                  portfolioTotals.totalHoldingsValueTon > 0 ? portfolioTotals.totalHoldingsValueTon : null,
                  portfolioTotals.totalHoldingsValueUsd > 0 ? portfolioTotals.totalHoldingsValueUsd : null
                ) ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border border-sky-300/80 bg-white/90 p-3 dark:border-sky-800 dark:bg-gray-900/90">
              <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">Current PnL</div>
              <div className="mt-1 space-y-1 text-lg font-semibold tabular-nums">
                {portfolioTotals.totalInvestedTon > 0 && (
                  <div className={pnlClassNameFromNumber(portfolioTotals.totalCurrentProfitTon)}>
                    {formatTonAmount(portfolioTotals.totalCurrentProfitTon)}
                  </div>
                )}
                {portfolioTotals.totalInvestedUsd > 0 && (
                  <div className={pnlClassNameFromNumber(portfolioTotals.totalCurrentProfitUsd)}>
                    {formatUsd(portfolioTotals.totalCurrentProfitUsd)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {(portfolioTotals?.hasIncompleteTon || portfolioTotals?.hasIncompleteUsd) && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          {portfolioTotals.hasIncompleteTon && "Some TON legs are missing amounts. "}
          {portfolioTotals.hasIncompleteUsd &&
            "Some USD legs lack valuation (no USDT and no jetton price) — USD totals may be understated."}
        </p>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PnlCard label="TON" {...pnl.ton} />
        {hasUsdtActivity ? (
          <PnlCard label="USDT" {...pnl.usdt} />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white/50 p-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/50">
            <div className="text-xs font-semibold tracking-wide uppercase">USDT</div>
            <p className="mt-2">No swaps with jetton USDT / USD₮ in data.</p>
          </div>
        )}
      </div>

      {showJettonLines && totalJettons > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-sky-800 dark:text-sky-200">
            Jetton PnL ({totalJettons} tokens)
          </h3>

          <JettonPnlPagination
            address={address}
            currentPage={safePage}
            totalPages={totalPages}
            totalJettons={totalJettons}
          />

          <div className="overflow-x-auto rounded border border-sky-200/80 dark:border-sky-900">
            <SwapJettonPnlLinesTable lines={visibleJettonLines} />
          </div>

          <JettonPnlPagination
            address={address}
            currentPage={safePage}
            totalPages={totalPages}
            totalJettons={totalJettons}
          />
        </div>
      )}
    </div>
  );
}
