"use client";

import type { JettonRateQuote } from "@/modules/jetton/domain/jetton-rates.types";
import { cn } from "@/shared/lib/utils";

interface JettonPriceCellProps {
  rate: JettonRateQuote | undefined;
  isLoading: boolean;
}

function formatUsdPrice(value: number): string {
  if (value >= 1) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }

  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
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
    return <span className="text-xs text-gray-400">…</span>;
  }

  const hasUsd = rate?.usd !== null && rate?.usd !== undefined && rate.usd > 0;
  const hasTon = rate?.ton !== null && rate?.ton !== undefined && rate.ton > 0;

  if (!hasUsd && !hasTon) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const diffValue = parseDiffPercent(rate?.diff24hUsd ?? null);
  const diffIsPositive = diffValue !== null && diffValue > 0;
  const diffIsNegative = diffValue !== null && diffValue < 0;

  return (
    <div className="min-w-[5.5rem]">
      {hasUsd && rate?.usd ? (
        <div className="font-medium text-gray-900 dark:text-gray-100">{formatUsdPrice(rate.usd)}</div>
      ) : hasTon && rate?.ton ? (
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {rate.ton.toLocaleString(undefined, { maximumFractionDigits: 6 })} TON
        </div>
      ) : null}
      {hasUsd && rate?.diff24hUsd && (
        <div
          className={cn(
            "mt-0.5 text-xs font-medium",
            diffIsPositive && "text-green-600 dark:text-green-400",
            diffIsNegative && "text-red-600 dark:text-red-400",
            diffValue === 0 && "text-gray-500"
          )}
        >
          {rate.diff24hUsd} 24h
        </div>
      )}
      {hasUsd && hasTon && rate?.ton && (
        <div className="mt-0.5 text-[10px] text-gray-500">
          {rate.ton.toLocaleString(undefined, { maximumFractionDigits: 6 })} TON
        </div>
      )}
    </div>
  );
}
