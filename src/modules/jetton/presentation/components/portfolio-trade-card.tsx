import type { PortfolioTradeDetail } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import {
  formatMoneyJetton,
  formatTonUsdPair,
} from "@/modules/jetton/domain/money-format.utils";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { tonapiBaseUrl } from "@/shared/config/env.public.config";
import { cn } from "@/shared/lib/utils";

const LEG_KIND_LABELS: Record<string, string> = {
  ton_jetton: "TON → Jetton",
  jetton_ton: "Jetton → TON",
  jetton_jetton: "Jetton ↔ Jetton",
  ton_ton: "TON ↔ TON",
  unknown: "Other",
};

interface PortfolioTradeCardProps {
  trade: PortfolioTradeDetail;
  jettonDecimals: number;
  jettonSymbol: string;
}

export function PortfolioTradeCard({ trade, jettonDecimals, jettonSymbol }: PortfolioTradeCardProps) {
  const tonviewerHref = buildTonviewerTransactionUrl(trade.tonEventId, null, tonapiBaseUrl);

  return (
    <li className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time className="text-xs text-muted-foreground" dateTime={trade.timestampIso}>
          {new Date(trade.timestampIso).toLocaleString()}
        </time>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-medium",
              trade.side === "sell" && "bg-loss/10 text-loss",
              trade.side === "buy" && "bg-profit/10 text-profit"
            )}
          >
            {trade.side === "buy" ? "Buy" : "Sell"}
          </span>
          {trade.dex && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{trade.dex}</span>
          )}
          {(trade.incompleteTon || trade.incompleteUsd) && (
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
              {trade.incompleteTon && trade.incompleteUsd
                ? "Incomplete"
                : trade.incompleteTon
                  ? "TON incomplete"
                  : "USD incomplete"}
            </span>
          )}
          {tonviewerHref && (
            <a
              href={tonviewerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:underline"
            >
              Tonviewer ↗
            </a>
          )}
        </div>
      </div>

      <div className="mt-1.5 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <span className="text-xs text-muted-foreground">Amount</span>
          <div className="font-medium text-foreground">
            {formatMoneyJetton(trade.jettonAmountRaw, jettonDecimals, jettonSymbol)}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Unit price · Total</span>
          <div className="font-medium tabular-nums">
            {trade.unitPriceDisplay ?? "—"}
            {(trade.totalTonFormatted || trade.totalUsdFormatted) && (
              <span className="text-muted-foreground">
                {" "}
                · {formatTonUsdPair(trade.totalTon, trade.totalUsd) ?? "—"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <span className="text-xs text-muted-foreground">{trade.side === "buy" ? "Paid" : "Received"}</span>
        <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
          {trade.paymentLegs.map((leg, index) => (
            <li key={`${trade.swapId}-leg-${index}`} className="flex flex-wrap justify-between gap-2">
              <span>{leg.label}</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatTonUsdPair(leg.ton, leg.usd) ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">{LEG_KIND_LABELS[trade.legKind] ?? trade.legKind}</div>
    </li>
  );
}
