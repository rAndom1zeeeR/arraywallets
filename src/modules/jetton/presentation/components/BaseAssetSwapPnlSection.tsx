"use client";

import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import {
  formatMoneyJetton,
  formatMoneyTonFromNanoton,
  formatTonAmount,
  formatUsd,
} from "@/modules/jetton/domain/money-format.utils";
import { pnlClassNameFromBigint } from "@/modules/jetton/domain/pnl-display.utils";
import { PnlAmountStack } from "@/modules/jetton/presentation/components/PnlAmountStack";
import type { TonPnlWithTransfers } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import type { AssetPnlFormatted } from "@/modules/swap/domain/swap-pnl.utils";
import { JettonPortfolioPnlTable } from "@/modules/jetton/presentation/components/JettonPortfolioPnlTable";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
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
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div
        className={cn(
          "font-medium tabular-nums",
          tone === "spent" && "text-loss",
          tone === "received" && "text-profit",
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
    <div className={pageStyles.metricCard}>
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums text-foreground", valueClassName)}>{value}</div>
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

  const formatFlowRaw = (raw: bigint): string =>
    currency === "ton"
      ? formatMoneyTonFromNanoton(raw)
      : formatMoneyJetton(raw, portfolioLine?.jetton.decimals ?? 6, portfolioLine?.jetton.symbol ?? "USDT");

  return (
    <section className={pageStyles.section}>
      <h2 className={pageStyles.sectionTitle}>{title}</h2>
      <p className={pageStyles.sectionSubtitle}>{subtitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {swapCount} swap{swapCount === 1 ? "" : "s"} · all amounts in {unitLabel}
      </p>

      {hasFlow ? (
        <div className={cn(pageStyles.metricCard, "mt-4")}>
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Swap flow ({unitLabel})
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm min-[400px]:grid-cols-3">
            <FlowMetric label="Spent" value={formatFlowRaw(flowPnl.spentRaw)} tone="spent" />
            <FlowMetric label="Received" value={formatFlowRaw(flowPnl.receivedRaw)} tone="received" />
            <FlowMetric label="Net" value={formatFlowRaw(flowPnl.netRaw)} tone="net" netRaw={flowPnl.netRaw} />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No activity for this asset in swaps.</p>
      )}

      {(portfolioLine || hasStandaloneTransfers) && (invested || holdingsValue || currentProfitFormatted) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PortfolioMetricBlock label={`Invested (${unitLabel})`} value={invested} />
          <PortfolioMetricBlock label={`Holdings (spot)`} value={holdingsValue} />
          {portfolioLine ? (
            <div className={pageStyles.metricCard}>
              <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{`PnL (${unitLabel})`}</div>
              <div className="mt-1">
                <PnlAmountStack
                  ton={currency === "ton" ? displayProfitTon : null}
                  usd={currency === "usd" ? currentProfitUsd : null}
                  percentTon={currency === "ton" ? portfolioLine.currentProfitPercentTon : null}
                  percentUsd={currency === "usd" ? portfolioLine.currentProfitPercentUsd : null}
                  size="lg"
                />
                {currency === "ton" && tonPnlWithTransfers && tonPnlWithTransfers.withdrawnTon > 0 && (
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {formatTonAmount(tonPnlWithTransfers.withdrawnTon)} withdrawn
                  </p>
                )}
                {currency === "ton" && tonPnlWithTransfers && tonPnlWithTransfers.depositedTon > 0 && (
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatTonAmount(tonPnlWithTransfers.depositedTon)} received
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className={pageStyles.metricCard}>
              <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{`PnL (${unitLabel})`}</div>
              <div className="mt-1">
                <PnlAmountStack ton={displayProfitTon} size="lg" />
                {tonPnlWithTransfers && tonPnlWithTransfers.withdrawnTon > 0 && (
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {formatTonAmount(tonPnlWithTransfers.withdrawnTon)} withdrawn
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasIncomplete && (
        <p className="mt-3 text-xs text-amber-400">
          Some trades lack counterparty valuation in {unitLabel} — cost basis and PnL may be incomplete.
        </p>
      )}

      {portfolioLine && portfolioLine.trades.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Trades ({portfolioLine.trades.length})
          </h3>
          <JettonPortfolioPnlTable rows={[portfolioLine]} />
        </div>
      )}
    </section>
  );
}
