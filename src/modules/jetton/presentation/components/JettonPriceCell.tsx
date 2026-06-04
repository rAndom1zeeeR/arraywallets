"use client";

import type { JettonRateQuote } from "@/modules/jetton/domain/jetton-rates.types";
import { formatMoney, formatPercentChange24h } from "@/modules/jetton/domain/money-format.utils";
import { cn } from "@/shared/lib/utils";

interface JettonPriceCellProps {
  rate: JettonRateQuote | undefined;
  isLoading: boolean;
}

function parseDiffPercent(diff: string | null): number | null {
  if (!diff) {
    return null;
  }

  const normalized = diff.replace(/[^\d.+-]/g, "");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function JettonPriceCell({ rate, isLoading }: JettonPriceCellProps) {
  if (isLoading) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }

  const hasUsd = rate?.usd !== null && rate?.usd !== undefined && rate.usd > 0;
  const hasTon = rate?.ton !== null && rate?.ton !== undefined && rate.ton > 0;

  if (!hasUsd && !hasTon) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const diffValue = parseDiffPercent(rate?.diff24hUsd ?? null);
  const diffIsPositive = diffValue !== null && diffValue > 0;
  const diffIsNegative = diffValue !== null && diffValue < 0;
  const diff24hText = diffValue !== null ? formatPercentChange24h(diffValue) : null;
  const usdPriceText = hasUsd && rate?.usd ? formatMoney(rate.usd, "usdUnitPrice") : null;
  const tonPriceText = hasTon && rate?.ton ? formatMoney(rate.ton, "tonUnitPrice") : null;

  return (
    <div className="min-w-[5rem] text-right sm:min-w-[5.5rem]">
      {usdPriceText ? (
        <div className="font-medium tabular-nums text-foreground">{usdPriceText}</div>
      ) : tonPriceText ? (
        <div className="font-medium tabular-nums text-foreground">{tonPriceText}</div>
      ) : null}
      {diff24hText && (
        <div
          className={cn(
            "mt-0.5 text-xs font-medium tabular-nums",
            diffIsPositive && "text-profit",
            diffIsNegative && "text-loss",
            diffValue === 0 && "text-muted-foreground"
          )}
        >
          {diff24hText}
        </div>
      )}
      {usdPriceText && tonPriceText && (
        <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{tonPriceText}</div>
      )}
    </div>
  );
}
