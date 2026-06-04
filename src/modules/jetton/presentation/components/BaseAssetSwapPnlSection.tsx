"use client";

import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import { formatTonAmount, formatUsd } from "@/modules/jetton/domain/money-format.utils";
import { pnlClassNameFromBigint } from "@/modules/jetton/domain/pnl-display.utils";
import { PnlAmountStack } from "@/modules/jetton/presentation/components/PnlAmountStack";
import type { TonPnlWithTransfers, TonTransferPnlSummary } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import type { AssetPnlFormatted } from "@/modules/swap/domain/swap-pnl.utils";
import { JettonPortfolioPnlTable } from "@/modules/jetton/presentation/components/JettonPortfolioPnlTable";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.config";
import { cn } from "@/shared/lib/utils";

export type BaseAssetPnlCurrency = "ton" | "usd";

interface BaseAssetSwapPnlSectionProps {
  title: string;
  subtitle: string;
  flowPnl: AssetPnlFormatted;
  portfolioLine: JettonPortfolioPnlLine | null;
  currency: BaseAssetPnlCurrency;
  swapCount: number;
  tonPnlWithTransfers?: TonPnlWithTransfers;
  tonTransfers?: TonTransferPnlSummary;
}

interface FlowMetricProps {
  label: string;
  value: string;
  tone?: "spent" | "received" | "net";
  netRaw?: bigint;
}

function FlowMetric({ label, value, tone = "spent", netRaw }: FlowMetricProps) {
  return (
    <div>
      <div className="text-[10px] text-gray-400 uppercase">{label}</div>
      <div
        className={cn(
          "font-medium tabular-nums",
          tone === "spent" && "text-red-600 dark:text-red-400",
          tone === "received" && "text-green-600 dark:text-green-400",
          tone === "net" && cn("font-semibold", netRaw !== undefined && pnlClassNameFromBigint(netRaw))
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PortfolioMetricBlock({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | null;
  valueClassName?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white/90 p-3 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", valueClassName)}>{value}</div>
    </div>
  );
}

export function BaseAssetSwapPnlSection({
  title,
  subtitle,
  flowPnl,
  portfolioLine,
  currency,
  swapCount,
  tonPnlWithTransfers,
  tonTransfers,
}: BaseAssetSwapPnlSectionProps) {
  const unitLabel = currency === "ton" ? "TON" : "USD";
  const hasFlow = flowPnl.spentRaw > 0n || flowPnl.receivedRaw > 0n;
  const hasStandaloneTransfers =
    tonPnlWithTransfers !== undefined &&
    (tonPnlWithTransfers.withdrawnTon > 0 || tonPnlWithTransfers.depositedTon > 0);

  const invested =
    currency === "ton"
      ? portfolioLine && portfolioLine.totalInvestedTon > 0
        ? formatTonAmount(portfolioLine.totalInvestedTon)
        : null
      : portfolioLine && portfolioLine.totalInvestedUsd > 0
        ? formatUsd(portfolioLine.totalInvestedUsd)
        : null;

  const holdingsValue =
    currency === "ton" && hasStandaloneTransfers && tonPnlWithTransfers
      ? formatTonAmount(tonPnlWithTransfers.onWalletTon)
      : currency === "ton"
        ? portfolioLine?.holdingsValueTon !== null && portfolioLine?.holdingsValueTon !== undefined
          ? formatTonAmount(portfolioLine.holdingsValueTon)
          : null
        : portfolioLine?.holdingsValueUsd !== null && portfolioLine?.holdingsValueUsd !== undefined
          ? formatUsd(portfolioLine.holdingsValueUsd)
          : null;

  const displayProfitTon =
    currency === "ton" && tonPnlWithTransfers
      ? tonPnlWithTransfers.totalProfitTon
      : (portfolioLine?.currentProfitTon ?? null);
  const currentProfitUsd = portfolioLine?.currentProfitUsd ?? null;

  const currentProfitFormatted =
    currency === "ton"
      ? displayProfitTon !== null
        ? formatTonAmount(displayProfitTon)
        : null
      : currentProfitUsd !== null
        ? formatUsd(currentProfitUsd)
        : null;

  const hasIncomplete =
    currency === "ton" ? portfolioLine?.hasIncompleteTonBasis : portfolioLine?.hasIncompleteUsdBasis;

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
      <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
        {swapCount} swap{swapCount === 1 ? "" : "s"} · все суммы в {unitLabel}
      </p>

      {hasFlow ? (
        <div className="mt-3 rounded-lg border border-sky-300/80 bg-white/90 p-3 dark:border-sky-800 dark:bg-gray-900/90">
          <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Поток по свапам ({unitLabel})
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <FlowMetric label="Spent" value={flowPnl.spent} tone="spent" />
            <FlowMetric label="Received" value={flowPnl.received} tone="received" />
            <FlowMetric label="Net" value={flowPnl.net} tone="net" netRaw={flowPnl.netRaw} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Нет движения по этому активу в свапах.</p>
      )}

      {(portfolioLine || hasStandaloneTransfers) && (invested || holdingsValue || currentProfitFormatted) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <PortfolioMetricBlock label={`Вложено (${unitLabel})`} value={invested} />
          <PortfolioMetricBlock label={`Остаток (spot)`} value={holdingsValue} />
          {portfolioLine ? (
            <div className="rounded-lg border border-gray-200 bg-white/90 p-3 dark:border-gray-700 dark:bg-gray-900/90">
              <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">{`PnL (${unitLabel})`}</div>
              <div className="mt-1">
                <PnlAmountStack
                  ton={currency === "ton" ? displayProfitTon : null}
                  usd={currency === "usd" ? currentProfitUsd : null}
                  percentTon={currency === "ton" ? portfolioLine.currentProfitPercentTon : null}
                  percentUsd={currency === "usd" ? portfolioLine.currentProfitPercentUsd : null}
                  size="lg"
                />
                {currency === "ton" && tonPnlWithTransfers && tonPnlWithTransfers.withdrawnTon > 0 && (
                  <p className="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {formatTonAmount(tonPnlWithTransfers.withdrawnTon)} выведено
                  </p>
                )}
                {currency === "ton" && tonPnlWithTransfers && tonPnlWithTransfers.depositedTon > 0 && (
                  <p className="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {formatTonAmount(tonPnlWithTransfers.depositedTon)} получено
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white/90 p-3 dark:border-gray-700 dark:bg-gray-900/90">
              <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">{`PnL (${unitLabel})`}</div>
              <div className="mt-1">
                <PnlAmountStack ton={displayProfitTon} size="lg" />
                {tonPnlWithTransfers && tonPnlWithTransfers.withdrawnTon > 0 && (
                  <p className="mt-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {formatTonAmount(tonPnlWithTransfers.withdrawnTon)} выведено
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasIncomplete && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Часть сделок без оценки контрагента в {unitLabel} — cost basis и PnL могут быть неполными.
        </p>
      )}

      {currency === "ton" && tonTransfers && tonTransfers.items.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white/90 p-3 dark:border-gray-700 dark:bg-gray-900/90">
          <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Чистые переводы TON ({tonTransfers.items.length})
          </div>
          <ul className="mt-2 space-y-1.5">
            {tonTransfers.items.map(item => {
              const tonviewerHref = buildTonviewerTransactionUrl(item.tonEventId, null, tonapiBaseUrl);
              const directionLabel = item.direction === "OUTGOING" ? "вывод" : "ввод";
              const counterpartyLabel = item.counterparty ? ` · ${item.counterparty}` : "";

              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">
                    <span
                      className={cn(
                        "font-medium",
                        item.direction === "OUTGOING"
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {item.direction === "OUTGOING" ? "−" : "+"}
                      {formatTonAmount(item.amountTon)} TON
                    </span>
                    <span className="text-xs text-gray-500">
                      {" "}
                      ({directionLabel}
                      {counterpartyLabel})
                    </span>
                  </span>
                  {tonviewerHref && (
                    <a
                      href={tonviewerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                    >
                      Tonviewer ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {portfolioLine && portfolioLine.trades.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-sky-800 dark:text-sky-200">
            Сделки ({portfolioLine.trades.length})
          </h3>
          <JettonPortfolioPnlTable rows={[portfolioLine]} />
        </div>
      )}
    </section>
  );
}
